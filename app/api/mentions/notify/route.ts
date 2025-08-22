import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Mention from '@/models/Mention';
import Notification from '@/models/Notification';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendNotificationToUser } from '@/lib/notifications';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      postId,
      commentId,
      mentionedUsers,
      content,
      positions,
    } = body;

    // バリデーション
    if (!content || !mentionedUsers || mentionedUsers.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      );
    }

    if (!postId && !commentId) {
      return NextResponse.json(
        { error: 'Either postId or commentId is required' },
        { status: 400 }
      );
    }

    if (postId && commentId) {
      return NextResponse.json(
        { error: 'Cannot have both postId and commentId' },
        { status: 400 }
      );
    }

    // メンション数の制限
    if (mentionedUsers.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 mentions allowed per post/comment' },
        { status: 400 }
      );
    }

    await connectDB();

    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 投稿またはコメントの存在確認
    let entity: any;
    let entityType: 'post' | 'comment';
    
    if (postId) {
      entity = await Post.findById(postId);
      entityType = 'post';
      if (!entity) {
        return NextResponse.json(
          { error: 'Post not found' },
          { status: 404 }
        );
      }
    } else {
      entity = await Comment.findById(commentId);
      entityType = 'comment';
      if (!entity) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }
    }

    // メンションデータの準備
    const mentionData = mentionedUsers.map((userId: string, index: number) => ({
      userId,
      username: positions?.[index]?.username || '',
      position: positions?.[index] || { start: 0, end: 0 },
    }));

    // メンションを作成
    const mentions = await Mention.createMentions(
      entityType,
      entity._id.toString(),
      currentUser._id.toString(),
      mentionData,
      content
    );

    // 通知を作成
    const notifications = [];
    const notificationPromises = [];

    for (const mention of mentions) {
      // 自分自身へのメンションは通知しない
      if (mention.mentionedUser.toString() === currentUser._id.toString()) {
        continue;
      }

      // 通知を作成
      const notification = new Notification({
        recipient: mention.mentionedUser,
        sender: currentUser._id,
        type: 'mention',
        message: `${currentUser.name}さんがあなたをメンションしました`,
        relatedPost: postId || undefined,
        relatedComment: commentId || undefined,
        mentionId: mention._id,
        read: false,
      });

      await notification.save();
      notifications.push(notification);

      // メンションを通知送信済みにする
      mention.notificationSent = true;
      await mention.save();

      // リアルタイム通知を送信
      const mentionedUser = await User.findById(mention.mentionedUser);
      if (mentionedUser) {
        notificationPromises.push(
          sendNotificationToUser(
            mentionedUser._id.toString(),
            {
              type: 'mention',
              title: 'メンション通知',
              body: `${currentUser.name}さんがあなたをメンションしました`,
              data: {
                postId: postId || undefined,
                commentId: commentId || undefined,
                mentionId: mention._id.toString(),
                senderName: currentUser.name,
                senderImage: currentUser.profileImage,
              },
            }
          )
        );
      }
    }

    // リアルタイム通知を並列で送信
    await Promise.allSettled(notificationPromises);

    // メンション統計を更新
    for (const userId of mentionedUsers) {
      await User.findByIdAndUpdate(
        userId,
        {
          $inc: {
            'mentionStats.totalMentions': 1,
            'mentionStats.unreadMentions': 1,
          },
        }
      );
    }

    return NextResponse.json({
      success: true,
      mentions: mentions.map(m => ({
        _id: m._id,
        mentionedUser: m.mentionedUser,
        content: m.content,
        position: m.position,
      })),
      notifications: notifications.map(n => ({
        _id: n._id,
        recipient: n.recipient,
        type: n.type,
        message: n.message,
      })),
    });

  } catch (error) {
    console.error('Error creating mention notifications:', error);
    return NextResponse.json(
      { error: 'Failed to create mention notifications' },
      { status: 500 }
    );
  }
}

// メンション一覧取得
export async function GET(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as 'received' | 'sent' || 'received';
    const read = searchParams.get('read') === 'true' ? true : 
                 searchParams.get('read') === 'false' ? false : undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    await connectDB();

    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // メンションを取得
    const skip = (page - 1) * limit;
    const mentions = await Mention.getUserMentions(
      currentUser._id.toString(),
      { type, read, limit, skip }
    );

    // 総数を取得
    const query: any = {};
    if (type === 'received') {
      query.mentionedUser = currentUser._id;
    } else {
      query.mentionedBy = currentUser._id;
    }
    if (read !== undefined) {
      query.read = read;
    }
    const total = await Mention.countDocuments(query);

    return NextResponse.json({
      mentions,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + mentions.length < total,
      },
    });

  } catch (error) {
    console.error('Error fetching mentions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentions' },
      { status: 500 }
    );
  }
}
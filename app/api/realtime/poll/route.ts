import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Notification from '@/models/Notification';
import Comment from '@/models/Comment';

interface RealtimeEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const lastEventId = searchParams.get('lastEventId');
    const timestamp = searchParams.get('timestamp');
    
    // タイムスタンプの決定（デフォルトは過去30秒）
    const since = timestamp 
      ? new Date(timestamp) 
      : new Date(Date.now() - 30000);

    const events: RealtimeEvent[] = [];

    // 新着投稿を取得
    const newPosts = await Post.find({
      createdAt: { $gt: since },
      author: { $ne: session.user.id }, // 自分の投稿は除外
    })
      .populate('author', 'name email profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    newPosts.forEach(post => {
      events.push({
        type: 'post:created',
        payload: {
          post: {
            id: post._id.toString(),
            title: post.title,
            content: post.content,
            author: post.author,
            createdAt: post.createdAt,
          },
          timestamp: post.createdAt,
        },
        timestamp: post.createdAt,
      });
    });

    // 新着通知を取得
    const newNotifications = await Notification.find({
      userId: session.user.id,
      createdAt: { $gt: since },
      read: false,
    })
      .sort({ createdAt: -1 })
      .limit(10);

    newNotifications.forEach(notification => {
      events.push({
        type: 'notification:new',
        payload: {
          notification: {
            id: notification._id.toString(),
            type: notification.type,
            title: notification.title,
            message: notification.message,
            read: notification.read,
            createdAt: notification.createdAt,
          },
          userId: session.user.id,
          priority: notification.priority || 'normal',
        },
        timestamp: notification.createdAt,
      });
    });

    // 新着コメントを取得（自分の投稿へのコメント）
    const userPosts = await Post.find({
      author: session.user.id,
    }).select('_id');
    
    const postIds = userPosts.map(p => p._id);
    
    if (postIds.length > 0) {
      const newComments = await Comment.find({
        postId: { $in: postIds },
        author: { $ne: session.user.id },
        createdAt: { $gt: since },
      })
        .populate('author', 'name email profileImage')
        .sort({ createdAt: -1 })
        .limit(10);

      newComments.forEach(comment => {
        events.push({
          type: 'comment:added',
          payload: {
            comment: {
              id: comment._id.toString(),
              postId: comment.postId.toString(),
              content: comment.content,
              author: comment.author,
              createdAt: comment.createdAt,
            },
            timestamp: comment.createdAt,
          },
          timestamp: comment.createdAt,
        });
      });
    }

    // いいねの更新を取得
    const likedPosts = await Post.find({
      author: session.user.id,
      'likes.createdAt': { $gt: since },
    }).select('_id likes');

    likedPosts.forEach(post => {
      const recentLikes = post.likes.filter(
        (like: any) => like.createdAt > since
      );
      
      recentLikes.forEach((like: any) => {
        events.push({
          type: 'post:liked',
          payload: {
            postId: post._id.toString(),
            userId: like.userId,
            likeCount: post.likes.length,
            timestamp: like.createdAt,
          },
          timestamp: like.createdAt,
        });
      });
    });

    // イベントを時系列でソート
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({
      events,
      timestamp: new Date().toISOString(),
      nextPollDelay: events.length > 0 ? 3000 : 5000, // イベントがある場合は短い間隔
    });
  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// ロングポーリング用のエンドポイント（オプション）
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { timeout = 30000 } = await request.json();
    const startTime = Date.now();
    const events: RealtimeEvent[] = [];

    // ロングポーリング: イベントが発生するまで待機
    while (Date.now() - startTime < timeout && events.length === 0) {
      // データベースの変更を監視
      // 実際の実装では MongoDB Change Streams を使用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 新しいイベントをチェック
      // ... (GET メソッドと同様の処理)
      
      if (events.length > 0) {
        break;
      }
    }

    return NextResponse.json({
      events,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Long polling error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
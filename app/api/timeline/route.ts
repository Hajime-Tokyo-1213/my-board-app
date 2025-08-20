import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import Follow from '@/models/Follow';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // フォローしているユーザーのIDを取得
    const following = await Follow.find({ 
      followerId: session.user.id
    }).select('followingId');
    
    const followingIds = following.map(f => f.followingId.toString());
    
    // 自分のIDも含める
    const userIds = [...followingIds, session.user.id];

    // 投稿を取得（新しい順）- authorIdフィールドを使用
    const posts = await Post.find({ 
      authorId: { $in: userIds }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 総投稿数を取得
    const totalPosts = await Post.countDocuments({ 
      authorId: { $in: userIds }
    });

    // レスポンス用にデータを整形
    const formattedPosts = posts.map(post => ({
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      userId: post.authorId,
      userName: post.authorName,
      userEmail: post.authorEmail,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      likesCount: post.likesCount || post.likes?.length || 0,
      commentsCount: 0, // コメント機能は未実装
      isLiked: post.likes?.includes(session.user.id) || false,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit),
        hasMore: skip + posts.length < totalPosts
      }
    });

  } catch (error) {
    console.error('タイムライン取得エラー:', error);
    return NextResponse.json(
      { error: 'タイムラインの取得に失敗しました' },
      { status: 500 }
    );
  }
}
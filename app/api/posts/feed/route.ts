import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    // パラメータ取得
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const userId = searchParams.get('userId');
    const hashtag = searchParams.get('hashtag');

    // クエリ条件構築
    let query: any = {};

    // カーソルベースページネーション
    if (cursor) {
      try {
        // cursorは投稿IDまたはタイムスタンプ
        const cursorPost = await Post.findById(cursor).select('createdAt');
        if (cursorPost) {
          query = {
            $or: [
              { createdAt: { $lt: cursorPost.createdAt } },
              {
                createdAt: cursorPost.createdAt,
                _id: { $lt: new mongoose.Types.ObjectId(cursor) }
              }
            ]
          };
        }
      } catch (error) {
        console.error('カーソル解析エラー:', error);
      }
    }

    // ユーザーフィルター
    if (userId) {
      // 特定ユーザーの投稿のみ
      query.authorId = userId;
    }
    // userIdが指定されていない場合は、全ての投稿を表示（トップページ）
    // タイムライン専用のエンドポイントは別途作成する必要がある

    // ハッシュタグフィルター
    if (hashtag) {
      query.hashtags = hashtag;
    }

    // 投稿を取得（+1件取得して次ページの有無を判定）
    const posts = await Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();

    // 次ページの有無を判定
    const hasMore = posts.length > limit;
    const resultPosts = hasMore ? posts.slice(0, limit) : posts;

    // 次のカーソルを設定
    const nextCursor = hasMore ? resultPosts[resultPosts.length - 1]._id.toString() : null;

    // レスポンス形式を整形
    const formattedPosts = resultPosts.map(post => ({
      id: post._id.toString(),
      _id: post._id.toString(),
      title: post.title,
      userId: post.authorId,
      userName: post.authorName || 'Unknown User',
      userEmail: post.authorEmail,
      userImage: post.authorImage || null,
      content: post.content,
      imageUrl: post.images?.[0]?.url || null,
      videoUrl: post.videos?.[0]?.url || null,
      likeCount: post.likesCount || 0,
      commentCount: post.commentsCount || 0,
      likes: post.likes || [],
      hashtags: post.hashtags || [],
      images: post.images || [], // 画像配列を追加
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));

    return NextResponse.json({
      posts: formattedPosts,
      nextCursor,
      hasMore,
      totalNew: 0, // 新着投稿数（別途実装）
    });

  } catch (error) {
    console.error('フィード取得エラー:', error);
    return NextResponse.json(
      { error: 'フィードの取得に失敗しました' },
      { status: 500 }
    );
  }
}
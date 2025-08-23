import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Hashtag from '@/models/Hashtag';
import { authOptions } from '@/lib/auth';
import { sanitizePostInput } from '@/lib/sanitizer';
import { extractHashtags } from '@/app/utils/hashtag';

// 投稿一覧取得（ページネーション対応）
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // クエリパラメータから取得
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const cursor = searchParams.get('cursor');
    const skip = (page - 1) * limit;

    // クエリ条件
    let query: any = {};

    // カーソルベースページネーション対応
    if (cursor) {
      try {
        const cursorPost = await Post.findById(cursor).select('createdAt');
        if (cursorPost) {
          query = {
            $or: [
              { createdAt: { $lt: cursorPost.createdAt } },
              {
                createdAt: cursorPost.createdAt,
                _id: { $lt: cursor }
              }
            ]
          };
        }
      } catch (error) {
        console.error('カーソル解析エラー:', error);
      }
    }

    // 総投稿数を取得
    const totalCount = await Post.countDocuments(query);

    // 投稿を取得
    let postsQuery = Post.find(query)
      .sort({ createdAt: -1, _id: -1 });

    // カーソルベースの場合はskipを使わない
    if (!cursor) {
      postsQuery = postsQuery.skip(skip);
    }

    const posts = await postsQuery
      .limit(limit + 1)
      .lean();

    // 次ページの有無を判定
    const hasMore = posts.length > limit;
    const hasNextPage = hasMore;
    const resultPosts = hasMore ? posts.slice(0, limit) : posts;
    
    // commentsCountフィールドが存在しない場合は0を設定
    const postsWithCommentCount = resultPosts.map(post => ({
      ...post,
      commentsCount: post.commentsCount || 0
    }));

    // ページネーション情報
    const totalPages = Math.ceil(totalCount / limit);
    const hasPrevPage = page > 1;

    // カーソルベースの場合
    if (cursor) {
      const nextCursor = hasMore ? postsWithCommentCount[postsWithCommentCount.length - 1]._id.toString() : null;
      
      return NextResponse.json({
        success: true,
        data: postsWithCommentCount,
        posts: postsWithCommentCount,
        nextCursor,
        hasMore,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPrevPage,
        }
      });
    }

    // 通常のページネーション
    return NextResponse.json({
      success: true,
      data: postsWithCommentCount,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage,
      }
    });
  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 新規投稿作成
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // 認証チェック
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { title, content, images } = await request.json();

    // サニタイゼーション
    const sanitized = sanitizePostInput(title, content);

    // バリデーション
    if (!sanitized.title || sanitized.title.length === 0) {
      return NextResponse.json(
        { error: 'タイトルを入力してください' },
        { status: 400 }
      );
    }

    if (sanitized.title.length > 100) {
      return NextResponse.json(
        { error: 'タイトルは100文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (!sanitized.content || sanitized.content.length === 0) {
      return NextResponse.json(
        { error: '本文を入力してください' },
        { status: 400 }
      );
    }

    if (sanitized.content.length > 1000) {
      return NextResponse.json(
        { error: '本文は1000文字以内で入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    // ハッシュタグを抽出
    const combinedText = `${sanitized.title} ${sanitized.content}`;
    const hashtags = extractHashtags(combinedText);

    // 画像のバリデーション
    let validatedImages = [];
    if (images && Array.isArray(images)) {
      if (images.length > 4) {
        return NextResponse.json(
          { error: '画像は最大4枚まで添付できます' },
          { status: 400 }
        );
      }
      validatedImages = images.map(img => ({
        id: img.id,
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
        mediumUrl: img.mediumUrl,
        largeUrl: img.largeUrl
      }));
    }

    // 投稿を作成（サニタイズ済みのデータを使用）
    const post = await Post.create({
      title: sanitized.title,
      content: sanitized.content,
      authorId: session.user.id,
      authorName: session.user.name || 'Unknown',
      authorEmail: session.user.email,
      authorImage: session.user.image || null,
      likes: [],
      likesCount: 0,
      hashtags: hashtags,
      images: validatedImages
    });

    // ハッシュタグを更新（非同期で処理）
    if (hashtags.length > 0) {
      Promise.all(
        hashtags.map(async (tag) => {
          await Hashtag.findOneAndUpdate(
            { name: tag },
            {
              $inc: { count: 1 },
              $addToSet: { posts: post._id },
              $set: { lastUsed: new Date() }
            },
            { upsert: true, new: true }
          );
        })
      ).catch(error => {
        console.error('Error updating hashtags:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: post
    }, { status: 201 });
  } catch (error) {
    console.error('投稿作成エラー:', error);
    return NextResponse.json(
      { error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}
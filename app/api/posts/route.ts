import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import { authOptions } from '@/lib/auth';
import { sanitizePostInput } from '@/lib/sanitizer';

// 投稿一覧取得（ページネーション対応）
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // クエリパラメータからページ番号と表示数を取得
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // 総投稿数を取得
    const totalCount = await Post.countDocuments();

    // 投稿を取得（新しい順）
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ページネーション情報
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: posts,
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

    const { title, content } = await request.json();

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

    // 投稿を作成（サニタイズ済みのデータを使用）
    const post = await Post.create({
      title: sanitized.title,
      content: sanitized.content,
      authorId: session.user.id,
      authorName: session.user.name || 'Unknown',
      authorEmail: session.user.email,
      authorImage: session.user.image || null,
      likes: [],
      likesCount: 0
    });

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
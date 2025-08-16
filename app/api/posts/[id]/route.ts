import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import { authOptions } from '@/lib/auth';
import { sanitizePostInput } from '@/lib/sanitizer';

// 投稿詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('投稿取得エラー:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 投稿更新（自分の投稿のみ）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // 認証チェック
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;
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
    
    // 投稿を取得
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    // 投稿者チェック（authorIdで確認）
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '他のユーザーの投稿は編集できません' },
        { status: 403 }
      );
    }
    
    // 投稿を更新（サニタイズ済みのデータを使用）
    post.title = sanitized.title;
    post.content = sanitized.content;
    await post.save();
    
    return NextResponse.json({ success: true, data: post });
  } catch (error) {
    console.error('投稿更新エラー:', error);
    return NextResponse.json(
      { error: '投稿の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// 投稿削除（自分の投稿のみ）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // 認証チェック
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await dbConnect();
    const { id } = await params;
    
    // 投稿を取得
    const post = await Post.findById(id);
    
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    // 投稿者チェック（authorIdで確認）
    if (post.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '他のユーザーの投稿は削除できません' },
        { status: 403 }
      );
    }
    
    // 投稿を削除
    await Post.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    console.error('投稿削除エラー:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}
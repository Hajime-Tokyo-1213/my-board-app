import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';

// コメント削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    // コメント取得
    const comment = await Comment.findById(params.id);
    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    // 権限確認（自分のコメントのみ削除可能）
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: 'このコメントを削除する権限がありません' },
        { status: 403 }
      );
    }

    // コメント削除
    await Comment.findByIdAndDelete(params.id);

    // 投稿のコメント数を更新
    await Post.findByIdAndUpdate(comment.postId, {
      $inc: { commentsCount: -1 }
    });

    return NextResponse.json(
      { message: 'コメントを削除しました' },
      { status: 200 }
    );
  } catch (error) {
    console.error('コメント削除エラー:', error);
    return NextResponse.json(
      { error: 'コメントの削除に失敗しました' },
      { status: 500 }
    );
  }
}
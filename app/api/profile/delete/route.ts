import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';
import { authOptions } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    // パスワード確認（オプション）
    const body = await request.json();
    const { password } = body;

    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // パスワードが提供された場合は確認
    if (password) {
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'パスワードが正しくありません' },
          { status: 400 }
        );
      }
    }

    // ユーザーの投稿を全て削除
    await Post.deleteMany({ authorId: user._id.toString() });

    // ユーザーのいいねを全ての投稿から削除
    await Post.updateMany(
      { likes: user._id.toString() },
      { 
        $pull: { likes: user._id.toString() },
        $inc: { likesCount: -1 }
      }
    );

    // ユーザーアカウントを削除
    await User.deleteOne({ _id: user._id });

    return NextResponse.json({
      success: true,
      message: 'アカウントが削除されました'
    });

  } catch (error) {
    console.error('アカウント削除エラー:', error);
    return NextResponse.json(
      { error: 'アカウント削除に失敗しました' },
      { status: 500 }
    );
  }
}
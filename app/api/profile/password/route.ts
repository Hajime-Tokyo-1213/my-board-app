import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

// パスワード変更
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: '新しいパスワードが一致しません' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: '新しいパスワードは現在のパスワードと異なるものにしてください' },
        { status: 400 }
      );
    }

    await dbConnect();

    // ユーザーを取得（パスワード含む）
    const user = await User.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 現在のパスワードを確認
    const isValidPassword = await user.comparePassword(currentPassword);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 400 }
      );
    }

    // 新しいパスワードを設定（pre-saveフックでハッシュ化される）
    user.password = newPassword;
    await user.save();

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました'
    });
  } catch (error) {
    console.error('パスワード変更エラー:', error);
    return NextResponse.json(
      { error: 'パスワードの変更に失敗しました' },
      { status: 500 }
    );
  }
}
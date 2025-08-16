import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: '確認トークンが必要です' },
        { status: 400 }
      );
    }

    await dbConnect();

    // トークンでユーザーを検索
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return NextResponse.json(
        { error: '無効または期限切れのトークンです' },
        { status: 400 }
      );
    }

    // すでに確認済みの場合
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'メールアドレスは既に確認済みです' },
        { status: 200 }
      );
    }

    // メールアドレスを確認済みに更新
    user.emailVerified = new Date();
    user.verificationToken = null;
    await user.save();

    return NextResponse.json({
      message: 'メールアドレスが確認されました',
    });
  } catch (error) {
    console.error('メール確認エラー:', error);
    return NextResponse.json(
      { error: 'メール確認中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
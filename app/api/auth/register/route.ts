import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { sendEmail, generateVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // バリデーション
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'すべての項目を入力してください' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 既存ユーザーチェック
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // 確認トークン生成
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // ユーザー作成
    await User.create({
      email,
      password,
      name,
      verificationToken,
    });

    // 確認メール送信
    const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`;
    const emailContent = generateVerificationEmail(name, verificationUrl);
    
    await sendEmail({
      to: email,
      ...emailContent,
    });

    const skipEmailVerification = process.env.DISABLE_EMAIL === 'true';
    
    return NextResponse.json({
      message: skipEmailVerification 
        ? '登録が完了しました。メール確認はスキップされました。ログインしてください。'
        : '登録が完了しました。確認メールをご確認ください。',
      skipEmailVerification,
      verificationUrl: skipEmailVerification ? verificationUrl : undefined,
    });
  } catch (error) {
    console.error('登録エラー:', error);
    return NextResponse.json(
      { error: '登録中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
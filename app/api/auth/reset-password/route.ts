import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { sendEmail, generatePasswordResetEmail } from '@/lib/email';

// パスワードリセットリクエスト
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    // ユーザーを検索
    const user = await User.findOne({ email: email.toLowerCase() });

    // セキュリティのため、ユーザーが存在しない場合もエラーを返さない
    if (!user) {
      console.log(`パスワードリセット要求: ユーザーが見つからない - ${email}`);
      return NextResponse.json({
        message: 'メールアドレスが登録されている場合、パスワードリセットのリンクを送信しました。',
      });
    }

    // リセットトークンを生成
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1時間後

    // ユーザーにトークンを保存
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // リセットURL
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/new-password?token=${resetToken}`;

    // メール送信
    const emailContent = generatePasswordResetEmail(user.name, resetUrl);
    const result = await sendEmail({
      to: email,
      ...emailContent,
    });

    if (!result.success) {
      console.error('パスワードリセットメール送信エラー:', result.error);
      // ただし、セキュリティのためユーザーにはエラーを返さない
    }

    console.log(`パスワードリセットメール送信: ${email}`);
    console.log(`リセットURL: ${resetUrl}`);

    return NextResponse.json({
      message: 'メールアドレスが登録されている場合、パスワードリセットのリンクを送信しました。',
    });
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    return NextResponse.json(
      { error: 'パスワードリセットの処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// パスワードリセット実行
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    // バリデーション
    if (!token || !password) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    // トークンでユーザーを検索
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return NextResponse.json(
        { error: '無効または期限切れのトークンです' },
        { status: 400 }
      );
    }

    // 新しいパスワードを設定（pre-saveフックでハッシュ化される）
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return NextResponse.json({
      message: 'パスワードがリセットされました',
    });
  } catch (error) {
    console.error('パスワード更新エラー:', error);
    return NextResponse.json(
      { error: 'パスワードの更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
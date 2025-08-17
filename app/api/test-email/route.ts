import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, generateVerificationEmail } from '@/lib/email';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const key = searchParams.get('key');
  
  if (key !== 'test123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
  }

  console.log('=== テストメール送信開始 ===');
  console.log('送信先:', email);
  console.log('環境変数チェック:', {
    SMTP_HOST: process.env.SMTP_HOST || 'NOT SET',
    SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
    SMTP_USER: process.env.SMTP_USER || 'NOT SET',
    EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET',
    HAS_PASSWORD: !!process.env.SMTP_PASS,
  });

  try {
    const testUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/test`;
    const emailContent = generateVerificationEmail('テストユーザー', testUrl);
    
    const result = await sendEmail({
      to: email,
      ...emailContent,
    });

    console.log('メール送信結果:', result);

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'メール送信成功' : 'メール送信失敗',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('テストメール送信エラー:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
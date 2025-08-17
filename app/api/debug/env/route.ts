import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // セキュリティのため、特定のキーパラメータがある場合のみ実行
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (key !== 'debug123') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 環境変数の存在確認（値は表示しない）
  const envCheck = {
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: !!process.env.SMTP_PORT,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASS: !!process.env.SMTP_PASS,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
    MONGODB_URI: !!process.env.MONGODB_URI,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'not set',
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  // SMTP設定の一部を表示（デバッグ用）
  const smtpDebug = {
    host: process.env.SMTP_HOST || 'not set',
    port: process.env.SMTP_PORT || 'not set',
    user: process.env.SMTP_USER ? process.env.SMTP_USER.substring(0, 5) + '***' : 'not set',
    from: process.env.EMAIL_FROM || 'not set',
  };

  return NextResponse.json({
    message: 'Environment variables check',
    timestamp: new Date().toISOString(),
    envCheck,
    smtpDebug,
    note: 'true = 設定済み, false = 未設定'
  });
}
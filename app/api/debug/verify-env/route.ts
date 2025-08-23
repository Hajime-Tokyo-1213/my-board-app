import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // セキュリティのため、特定のキーパラメータがある場合のみ実行
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  
  if (process.env.NODE_ENV === 'production' && key !== process.env.DEBUG_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allEnvKeys = Object.keys(process.env);

  const importantKeys = [
    'MONGODB_URI',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM',
    'NODE_ENV',
    'VERCEL_ENV',
    'DEBUG_KEY'
  ];

  const envStatus = importantKeys.reduce((acc, key) => {
    acc[key] = allEnvKeys.includes(key);
    return acc;
  }, {} as Record<string, boolean>);

  return NextResponse.json({
    message: 'Vercel Environment Variable Check',
    checkTimestamp: new Date().toISOString(),
    envStatus,
    note: 'true = 設定済み, false = 未設定'
  });
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const testToken = 'test123';
  
  // 現在のNEXTAUTH_URLの値を確認
  const currentUrl = process.env.NEXTAUTH_URL;
  
  // 正しいURL生成のテスト
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${testToken}`;
  
  // URLをデコード
  const decodedUrl = verificationUrl.replace(/&#x2F;/g, '/');
  
  return NextResponse.json({
    currentNEXTAUTH_URL: currentUrl,
    generatedUrl: verificationUrl,
    decodedUrl: decodedUrl,
    note: 'URLに&#x2F;が含まれている場合は、NEXTAUTH_URLの設定を確認してください'
  });
}
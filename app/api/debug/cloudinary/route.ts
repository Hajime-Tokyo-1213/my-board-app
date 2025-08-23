import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（オプション）
    const session = await getServerSession(authOptions);
    
    // 環境変数の状態を確認
    const cloudinaryConfig = {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not Set',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not Set',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not Set',
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not Set',
    };

    // 実際の値（cloud_nameのみ表示、他はセキュリティのため非表示）
    const actualValues = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'Not Set',
      next_public_cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'Not Set',
    };

    return NextResponse.json({
      status: 'ok',
      environment: process.env.NODE_ENV,
      session: session ? 'Authenticated' : 'Not Authenticated',
      cloudinary_config: cloudinaryConfig,
      actual_cloud_names: actualValues,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Debug API error:', error);
    return NextResponse.json(
      { 
        error: 'Debug API error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
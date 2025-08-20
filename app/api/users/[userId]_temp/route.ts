import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

interface UserData {
  _id: any;
  name: string;
  email: string;
  bio?: string;
  createdAt: Date;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await dbConnect();

    const { userId } = await params;
    const user = await User.findById(userId)
      .select('name email bio createdAt')
      .lean() as UserData | null;

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Follow from '@/models/Follow';

interface UserData {
  _id: any;
  name: string;
  email: string;
  bio?: string;
  createdAt: Date;
  followingCount?: number;
  followersCount?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await dbConnect();

    const { userId } = await params;
    const user = await User.findById(userId)
      .select('name email bio createdAt followingCount followersCount')
      .lean() as UserData | null;

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // フォロー数とフォロワー数をカウント（データベースに保存されていない場合のフォールバック）
    const [followingCount, followersCount] = await Promise.all([
      user.followingCount ?? Follow.countDocuments({ followerId: user._id }),
      user.followersCount ?? Follow.countDocuments({ followingId: user._id })
    ]);

    return NextResponse.json({
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        bio: user.bio || '',
        createdAt: user.createdAt,
        followingCount,
        followersCount,
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
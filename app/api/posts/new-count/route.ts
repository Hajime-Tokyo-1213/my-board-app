import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    // パラメータ取得
    const { searchParams } = new URL(request.url);
    const sincePostId = searchParams.get('since');

    if (!sincePostId) {
      return NextResponse.json({ count: 0 });
    }

    // 基準となる投稿を取得
    const sincePost = await Post.findById(sincePostId).select('createdAt');
    if (!sincePost) {
      return NextResponse.json({ count: 0 });
    }

    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ count: 0 });
    }

    // フォローしているユーザーのIDリスト
    const followingIds = currentUser.following || [];
    const userIds = [currentUser._id.toString(), ...followingIds];

    // 新着投稿の数をカウント
    const count = await Post.countDocuments({
      userId: { $in: userIds },
      createdAt: { $gt: sincePost.createdAt }
    });

    return NextResponse.json({ count });

  } catch (error) {
    console.error('新着投稿カウントエラー:', error);
    return NextResponse.json(
      { error: '新着投稿数の取得に失敗しました' },
      { status: 500 }
    );
  }
}
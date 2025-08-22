import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    // セッション確認
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const excludeIds = searchParams.get('excludeIds')?.split(',') || [];

    // 検索クエリが空の場合
    if (!query || query.length === 0) {
      return NextResponse.json({ users: [] });
    }

    await connectDB();

    // 現在のユーザーを取得
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 除外するユーザーIDリストに現在のユーザーを追加
    const excludeUserIds = [...excludeIds, currentUser._id.toString()];

    // 日本語対応の検索クエリを構築
    // username、name、emailで部分一致検索
    const searchRegex = new RegExp(query, 'i');
    
    const searchConditions = {
      $and: [
        {
          _id: { $nin: excludeUserIds }
        },
        {
          $or: [
            { username: searchRegex },
            { name: searchRegex },
            { email: searchRegex }
          ]
        }
      ]
    };

    // ユーザーを検索
    const users = await User.find(searchConditions)
      .select('_id username name profileImage isVerified')
      .limit(limit)
      .sort({ 
        // 検証済みユーザーを優先
        isVerified: -1,
        // フォロワー数が多いユーザーを優先（もしあれば）
        followersCount: -1,
        // 名前でソート
        name: 1
      })
      .lean();

    // スコアリング（検索精度向上）
    const scoredUsers = users.map(user => {
      let score = 0;
      
      // 完全一致
      if (user.username.toLowerCase() === query.toLowerCase()) {
        score += 100;
      }
      if (user.name.toLowerCase() === query.toLowerCase()) {
        score += 80;
      }
      
      // 前方一致
      if (user.username.toLowerCase().startsWith(query.toLowerCase())) {
        score += 50;
      }
      if (user.name.toLowerCase().startsWith(query.toLowerCase())) {
        score += 40;
      }
      
      // 部分一致
      if (user.username.toLowerCase().includes(query.toLowerCase())) {
        score += 20;
      }
      if (user.name.toLowerCase().includes(query.toLowerCase())) {
        score += 15;
      }
      
      // 検証済みユーザーボーナス
      if (user.isVerified) {
        score += 10;
      }
      
      return { ...user, score };
    });

    // スコアでソート
    scoredUsers.sort((a, b) => b.score - a.score);

    // スコアを除外して返す
    const finalUsers = scoredUsers.map(({ score, ...user }) => user);

    return NextResponse.json({ 
      users: finalUsers,
      total: finalUsers.length 
    });

  } catch (error) {
    console.error('Error searching users for mention:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'similar';
    const excludeFollowing = searchParams.get('excludeFollowing') === 'true';

    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let users: any[] = [];
    const reasons = new Map<string, string>();

    switch (type) {
      case 'similar':
        users = await getSimilarUsers(currentUser, limit, excludeFollowing);
        users.forEach(user => {
          reasons.set(user._id.toString(), '共通の興味・関心があります');
        });
        break;

      case 'popular':
        users = await getPopularUsers(currentUser, limit, excludeFollowing);
        users.forEach(user => {
          reasons.set(user._id.toString(), '人気のユーザーです');
        });
        break;

      case 'active':
        users = await getActiveUsers(currentUser, limit, excludeFollowing);
        users.forEach(user => {
          reasons.set(user._id.toString(), 'アクティブに活動中です');
        });
        break;

      case 'new':
        users = await getNewUsers(currentUser, limit, excludeFollowing);
        users.forEach(user => {
          reasons.set(user._id.toString(), '新規登録ユーザーです');
        });
        break;

      case 'followersOfFollowing':
        users = await getFollowersOfFollowing(currentUser, limit, excludeFollowing);
        users.forEach(user => {
          reasons.set(user._id.toString(), 'フォロー中のユーザーがフォローしています');
        });
        break;

      default:
        // 複合的なおすすめ
        const similar = await getSimilarUsers(currentUser, Math.floor(limit / 3), excludeFollowing);
        const popular = await getPopularUsers(currentUser, Math.floor(limit / 3), excludeFollowing);
        const active = await getActiveUsers(currentUser, Math.ceil(limit / 3), excludeFollowing);
        
        similar.forEach(user => {
          users.push(user);
          reasons.set(user._id.toString(), '共通の興味・関心があります');
        });
        popular.forEach(user => {
          if (!users.find(u => u._id.toString() === user._id.toString())) {
            users.push(user);
            reasons.set(user._id.toString(), '人気のユーザーです');
          }
        });
        active.forEach(user => {
          if (!users.find(u => u._id.toString() === user._id.toString())) {
            users.push(user);
            reasons.set(user._id.toString(), 'アクティブに活動中です');
          }
        });
    }

    // スコアを計算してソート
    const scoredUsers = await calculateRecommendationScores(users, currentUser);
    
    // レスポンス形式に変換
    const recommendations = scoredUsers.slice(0, limit).map(user => ({
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        bio: user.bio,
        avatar: user.avatar,
        profileImage: user.profileImage,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        postsCount: user.postsCount,
        isFollowing: currentUser.following?.includes(user._id.toString()) || false,
      },
      reason: reasons.get(user._id.toString()) || 'おすすめのユーザーです',
      score: user.recommendationScore || 0,
    }));

    return NextResponse.json({
      users: recommendations,
      totalCount: recommendations.length,
    });
  } catch (error) {
    console.error('Error getting recommended users:', error);
    return NextResponse.json(
      { error: 'Failed to get recommended users' },
      { status: 500 }
    );
  }
}

// 似ているユーザーを取得
async function getSimilarUsers(currentUser: any, limit: number, excludeFollowing: boolean) {
  const query: any = {
    _id: { $ne: currentUser._id },
  };

  if (excludeFollowing && currentUser.following?.length > 0) {
    query._id.$nin = currentUser.following;
  }

  // 現在のユーザーのタグや興味に基づいて検索
  if (currentUser.tags && currentUser.tags.length > 0) {
    query.tags = { $in: currentUser.tags };
  }

  // 言語設定が同じユーザーを優先
  if (currentUser.language && currentUser.language.length > 0) {
    query.language = { $in: currentUser.language };
  }

  const users = await User.find(query)
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
    .limit(limit * 2);

  // 共通のフォロワーが多いユーザーを優先
  const scoredUsers = await Promise.all(users.map(async (user) => {
    const commonFollowers = currentUser.followers?.filter((f: string) => 
      user.followers?.includes(f)
    ).length || 0;
    
    const commonFollowing = currentUser.following?.filter((f: string) =>
      user.following?.includes(f)
    ).length || 0;

    return {
      ...user.toObject(),
      similarityScore: commonFollowers + commonFollowing,
    };
  }));

  return scoredUsers
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

// 人気ユーザーを取得
async function getPopularUsers(currentUser: any, limit: number, excludeFollowing: boolean) {
  const query: any = {
    _id: { $ne: currentUser._id },
    followersCount: { $gt: 10 },
  };

  if (excludeFollowing && currentUser.following?.length > 0) {
    query._id.$nin = currentUser.following;
  }

  return await User.find(query)
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
    .sort({ followersCount: -1, postsCount: -1 })
    .limit(limit);
}

// アクティブユーザーを取得
async function getActiveUsers(currentUser: any, limit: number, excludeFollowing: boolean) {
  const query: any = {
    _id: { $ne: currentUser._id },
    lastActiveAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // 7日以内
  };

  if (excludeFollowing && currentUser.following?.length > 0) {
    query._id.$nin = currentUser.following;
  }

  return await User.find(query)
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
    .sort({ lastActiveAt: -1 })
    .limit(limit);
}

// 新規ユーザーを取得
async function getNewUsers(currentUser: any, limit: number, excludeFollowing: boolean) {
  const query: any = {
    _id: { $ne: currentUser._id },
    createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30日以内
  };

  if (excludeFollowing && currentUser.following?.length > 0) {
    query._id.$nin = currentUser.following;
  }

  return await User.find(query)
    .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
    .sort({ createdAt: -1 })
    .limit(limit);
}

// フォロー中のユーザーがフォローしているユーザーを取得
async function getFollowersOfFollowing(currentUser: any, limit: number, excludeFollowing: boolean) {
  if (!currentUser.following || currentUser.following.length === 0) {
    return [];
  }

  // フォロー中のユーザーを取得
  const followingUsers = await User.find({
    _id: { $in: currentUser.following }
  }).select('following');

  // フォロー中のユーザーがフォローしているユーザーIDを集計
  const recommendedUserIds = new Map<string, number>();
  
  followingUsers.forEach(user => {
    user.following?.forEach((followedId: string) => {
      if (followedId !== currentUser._id.toString() && 
          (!excludeFollowing || !currentUser.following.includes(followedId))) {
        recommendedUserIds.set(
          followedId,
          (recommendedUserIds.get(followedId) || 0) + 1
        );
      }
    });
  });

  // カウントが多い順にソート
  const sortedUserIds = Array.from(recommendedUserIds.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (sortedUserIds.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: { $in: sortedUserIds }
  }).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

  // 元の順序を保持
  const userMap = new Map(users.map(u => [u._id.toString(), u]));
  return sortedUserIds
    .map(id => userMap.get(id))
    .filter(Boolean);
}

// おすすめスコアを計算
async function calculateRecommendationScores(users: any[], currentUser: any) {
  return Promise.all(users.map(async (user) => {
    let score = 0;

    // 基本スコア（フォロワー数）
    score += Math.min(user.followersCount * 0.1, 20);

    // アクティビティスコア
    if (user.lastActiveAt) {
      const daysSinceActive = (Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActive < 1) score += 10;
      else if (daysSinceActive < 7) score += 5;
      else if (daysSinceActive < 30) score += 2;
    }

    // 投稿数スコア
    score += Math.min(user.postsCount * 0.05, 10);

    // プロフィール完成度スコア
    if (user.bio) score += 5;
    if (user.profileImage || user.avatar) score += 5;
    if (user.username) score += 3;
    if (user.displayName) score += 2;

    // 共通のタグ
    if (currentUser.tags && user.tags) {
      const commonTags = currentUser.tags.filter((tag: string) => 
        user.tags.includes(tag)
      );
      score += commonTags.length * 5;
    }

    // 言語の一致
    if (currentUser.language && user.language) {
      const commonLanguages = currentUser.language.filter((lang: string) =>
        user.language.includes(lang)
      );
      score += commonLanguages.length * 3;
    }

    return {
      ...user.toObject ? user.toObject() : user,
      recommendationScore: Math.min(score, 100),
    };
  }));
}
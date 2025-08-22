import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import {
  normalizeForSearch,
  expandSearchQuery,
  calculateSearchScore,
  sortBySearchScore,
} from '@/lib/japaneseSearch';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'relevance';

    if (!query) {
      return NextResponse.json({ 
        users: [],
        totalCount: 0,
        suggestions: [],
        relatedTags: []
      });
    }

    // クエリを正規化して展開
    const normalizedQuery = normalizeForSearch(query);
    const queryVariations = expandSearchQuery(query);

    // 検索条件を構築
    const searchConditions: any[] = [];

    // テキスト検索
    if (type === 'all' || type === 'name') {
      searchConditions.push(
        { name: { $regex: normalizedQuery, $options: 'i' } },
        { displayName: { $regex: normalizedQuery, $options: 'i' } }
      );
    }

    if (type === 'all' || type === 'username') {
      searchConditions.push(
        { username: { $regex: normalizedQuery, $options: 'i' } }
      );
    }

    if (type === 'all' || type === 'bio') {
      searchConditions.push(
        { bio: { $regex: normalizedQuery, $options: 'i' } }
      );
    }

    // クエリバリエーションでも検索
    queryVariations.forEach(variation => {
      searchConditions.push(
        { searchableText: { $regex: variation, $options: 'i' } }
      );
    });

    // ユーザーを検索
    let users = await User.find(
      { $or: searchConditions },
      {
        password: 0,
        verificationToken: 0,
        resetPasswordToken: 0,
        resetPasswordExpires: 0,
      }
    ).limit(limit + 50); // スコアリングのため多めに取得

    // 現在のユーザーのフォロー情報を取得
    const currentUser = await User.findById(session.user.id);
    const followingIds = currentUser?.following || [];

    // スコアを計算
    const scoredUsers = users.map(user => {
      const score = calculateSearchScore({
        query: normalizedQuery,
        targetText: user.searchableText || '',
        targetName: user.name,
        popularity: user.followersCount || 0,
        activity: user.lastActiveAt ? 
          (Date.now() - new Date(user.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24) : 0,
        isFollowing: followingIds.includes(user._id.toString()),
      });

      return {
        ...user.toObject(),
        score,
        isFollowing: followingIds.includes(user._id.toString()),
      };
    });

    // スコアでソート
    let sortedUsers = sortBySearchScore(scoredUsers);

    // ソートオプションの適用
    if (sort === 'popularity') {
      sortedUsers.sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0));
    } else if (sort === 'recent') {
      sortedUsers.sort((a, b) => {
        const aTime = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTime = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return bTime - aTime;
      });
    }

    // ページネーション
    const paginatedUsers = sortedUsers.slice(offset, offset + limit);

    // 検索候補を生成
    const suggestions = generateSuggestions(query, paginatedUsers);

    // 関連タグを取得
    const relatedTags = extractRelatedTags(paginatedUsers);

    return NextResponse.json({
      users: paginatedUsers.map(user => ({
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
        isFollowing: user.isFollowing,
        score: user.score,
      })),
      totalCount: sortedUsers.length,
      suggestions,
      relatedTags,
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

// 検索候補を生成
function generateSuggestions(query: string, users: any[]): string[] {
  const suggestions = new Set<string>();
  
  users.forEach(user => {
    if (user.name) suggestions.add(user.name);
    if (user.username) suggestions.add(user.username);
    if (user.displayName) suggestions.add(user.displayName);
  });

  return Array.from(suggestions)
    .filter(s => s.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);
}

// 関連タグを抽出
function extractRelatedTags(users: any[]): string[] {
  const tagCounts = new Map<string, number>();
  
  users.forEach(user => {
    if (user.tags && Array.isArray(user.tags)) {
      user.tags.forEach((tag: string) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    }
  });

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 10);
}
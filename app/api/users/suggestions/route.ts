import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { normalizeForSearch } from '@/lib/japaneseSearch';

// 検索履歴をメモリに保存（本番環境ではRedisを使用）
const searchHistoryCache = new Map<string, string[]>();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '5');
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const suggestions: Array<{
      type: 'user' | 'query' | 'history';
      value: string;
      metadata?: any;
    }> = [];

    if (!query) {
      // クエリが空の場合は履歴のみ返す
      if (includeHistory) {
        const history = searchHistoryCache.get(session.user.id) || [];
        history.slice(0, limit).forEach(item => {
          suggestions.push({
            type: 'history',
            value: item,
          });
        });
      }
      return NextResponse.json({ suggestions });
    }

    const normalizedQuery = normalizeForSearch(query);

    // 1. 検索履歴から候補を探す
    if (includeHistory) {
      const history = searchHistoryCache.get(session.user.id) || [];
      const historySuggestions = history
        .filter(h => h.toLowerCase().includes(normalizedQuery.toLowerCase()))
        .slice(0, 3);
      
      historySuggestions.forEach(item => {
        suggestions.push({
          type: 'history',
          value: item,
        });
      });
    }

    // 2. ユーザー名から候補を探す
    const userSuggestions = await User.find(
      {
        $or: [
          { name: { $regex: `^${normalizedQuery}`, $options: 'i' } },
          { username: { $regex: `^${normalizedQuery}`, $options: 'i' } },
          { displayName: { $regex: `^${normalizedQuery}`, $options: 'i' } },
        ]
      },
      {
        name: 1,
        username: 1,
        displayName: 1,
        profileImage: 1,
        followersCount: 1,
      }
    )
      .sort({ followersCount: -1 })
      .limit(limit);

    userSuggestions.forEach(user => {
      suggestions.push({
        type: 'user',
        value: user.displayName || user.name,
        metadata: {
          userId: user._id,
          username: user.username,
          profileImage: user.profileImage,
          followersCount: user.followersCount,
        },
      });
    });

    // 3. 一般的なクエリ候補
    const commonQueries = await generateQuerySuggestions(normalizedQuery);
    commonQueries.forEach(q => {
      suggestions.push({
        type: 'query',
        value: q,
      });
    });

    // 重複を削除して返す
    const uniqueSuggestions = removeDuplicates(suggestions);

    return NextResponse.json({
      suggestions: uniqueSuggestions.slice(0, limit),
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}

// 検索履歴を保存
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // 履歴に追加（最大50件）
    const userId = session.user.id;
    const history = searchHistoryCache.get(userId) || [];
    
    // 重複を削除して先頭に追加
    const newHistory = [
      query,
      ...history.filter(h => h !== query)
    ].slice(0, 50);
    
    searchHistoryCache.set(userId, newHistory);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving search history:', error);
    return NextResponse.json(
      { error: 'Failed to save search history' },
      { status: 500 }
    );
  }
}

// 検索履歴を削除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    searchHistoryCache.delete(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing search history:', error);
    return NextResponse.json(
      { error: 'Failed to clear search history' },
      { status: 500 }
    );
  }
}

// クエリ候補を生成
async function generateQuerySuggestions(query: string): Promise<string[]> {
  const suggestions: string[] = [];
  
  // よく使われる検索パターン
  const patterns = [
    `${query}さん`,
    `${query} ユーザー`,
    `${query} フォロー`,
    `@${query}`,
  ];
  
  patterns.forEach(pattern => {
    if (pattern.length <= 50) {
      suggestions.push(pattern);
    }
  });
  
  return suggestions.slice(0, 3);
}

// 重複を削除
function removeDuplicates(suggestions: any[]): any[] {
  const seen = new Set<string>();
  return suggestions.filter(s => {
    const key = `${s.type}:${s.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
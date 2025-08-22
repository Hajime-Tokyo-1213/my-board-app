import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Hashtag from '@/models/Hashtag';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'popular'; // popular, recent, search

    let hashtags;

    if (type === 'search' && query) {
      // 検索: 前方一致で候補を返す
      hashtags = await Hashtag.find({
        name: { $regex: `^${query.toLowerCase()}`, $options: 'i' }
      })
        .sort({ count: -1, lastUsed: -1 })
        .limit(limit)
        .select('name count');
    } else if (type === 'recent') {
      // 最近使用されたタグ
      hashtags = await Hashtag.find()
        .sort({ lastUsed: -1 })
        .limit(limit)
        .select('name count lastUsed');
    } else {
      // 人気のタグ（デフォルト）
      hashtags = await Hashtag.find()
        .sort({ count: -1, lastUsed: -1 })
        .limit(limit)
        .select('name count');
    }

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error('Error fetching hashtags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hashtags' },
      { status: 500 }
    );
  }
}
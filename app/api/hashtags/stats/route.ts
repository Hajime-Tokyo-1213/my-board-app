import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Hashtag from '@/models/Hashtag';

/**
 * ハッシュタグの統計情報を更新
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hashtags, postId } = await request.json();

    if (!hashtags || !Array.isArray(hashtags)) {
      return NextResponse.json(
        { error: 'Invalid hashtags data' },
        { status: 400 }
      );
    }

    await dbConnect();

    // 各ハッシュタグの統計を更新
    const updatePromises = hashtags.map(async (tag: string) => {
      const normalizedTag = tag.normalize('NFC').toLowerCase();
      
      return Hashtag.findOneAndUpdate(
        { name: normalizedTag },
        {
          $inc: { count: 1 },
          $addToSet: postId ? { posts: postId } : {},
          $set: { lastUsed: new Date() }
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating hashtag stats:', error);
    return NextResponse.json(
      { error: 'Failed to update hashtag statistics' },
      { status: 500 }
    );
  }
}

/**
 * ハッシュタグの統計情報を取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    if (tag) {
      // 特定のタグの統計
      const normalizedTag = tag.normalize('NFC').toLowerCase();
      const hashtag = await Hashtag.findOne({ name: normalizedTag });
      
      if (!hashtag) {
        return NextResponse.json({ 
          tag: normalizedTag,
          count: 0,
          posts: [],
          lastUsed: null
        });
      }

      return NextResponse.json({
        tag: hashtag.name,
        count: hashtag.count,
        postsCount: hashtag.posts.length,
        lastUsed: hashtag.lastUsed
      });
    } else {
      // 全体の統計
      const totalTags = await Hashtag.countDocuments();
      const topTags = await Hashtag.find()
        .sort({ count: -1 })
        .limit(10)
        .select('name count');

      const recentTags = await Hashtag.find()
        .sort({ lastUsed: -1 })
        .limit(10)
        .select('name count lastUsed');

      return NextResponse.json({
        totalTags,
        topTags,
        recentTags
      });
    }
  } catch (error) {
    console.error('Error fetching hashtag stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hashtag statistics' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import Hashtag from '@/models/Hashtag';

interface RouteParams {
  params: {
    tag: string;
  };
}

/**
 * 特定のハッシュタグを含む投稿を検索
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { tag } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'recent'; // recent, popular, relevant

    if (!tag) {
      return NextResponse.json({ error: 'Tag parameter is required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;
    const decodedTag = decodeURIComponent(tag);
    const normalizedTag = decodedTag.normalize('NFC').toLowerCase();

    // ハッシュタグの統計を更新（検索回数をカウント）
    await Hashtag.findOneAndUpdate(
      { name: normalizedTag },
      { 
        $inc: { searchCount: 1 },
        $set: { lastSearched: new Date() }
      }
    );

    // ソート条件を設定
    let sortCriteria: any = { createdAt: -1 }; // デフォルトは最新順
    if (sortBy === 'popular') {
      sortCriteria = { likesCount: -1, commentsCount: -1, createdAt: -1 };
    }

    // ハッシュタグを含む投稿を検索
    const posts = await Post.find({ hashtags: normalizedTag })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .select('title content authorId authorName authorEmail authorImage likes likesCount commentsCount hashtags createdAt updatedAt');

    const totalCount = await Post.countDocuments({ hashtags: normalizedTag });

    // 関連するハッシュタグを取得（共起タグ）
    const relatedTags = await Post.aggregate([
      { $match: { hashtags: normalizedTag } },
      { $unwind: '$hashtags' },
      { $match: { hashtags: { $ne: normalizedTag } } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { tag: '$_id', count: 1, _id: 0 } }
    ]);

    // ハッシュタグの統計情報を取得
    const tagInfo = await Hashtag.findOne({ name: normalizedTag });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
      tag: {
        name: normalizedTag,
        displayName: decodedTag,
        count: tagInfo?.count || totalCount,
        lastUsed: tagInfo?.lastUsed,
        description: tagInfo?.description,
      },
      relatedTags,
    });
  } catch (error) {
    console.error('Error searching posts by hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to search posts' },
      { status: 500 }
    );
  }
}

/**
 * ハッシュタグの情報を更新（説明文の追加など）
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tag } = params;
    const { description } = await request.json();

    await dbConnect();

    const normalizedTag = decodeURIComponent(tag).normalize('NFC').toLowerCase();

    const updatedTag = await Hashtag.findOneAndUpdate(
      { name: normalizedTag },
      { 
        $set: { 
          description,
          updatedAt: new Date()
        }
      },
      { new: true, upsert: true }
    );

    return NextResponse.json({ 
      success: true,
      tag: updatedTag
    });
  } catch (error) {
    console.error('Error updating hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to update hashtag' },
      { status: 500 }
    );
  }
}
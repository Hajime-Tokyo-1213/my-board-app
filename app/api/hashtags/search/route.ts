import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!tag) {
      return NextResponse.json({ error: 'Tag parameter is required' }, { status: 400 });
    }

    const skip = (page - 1) * limit;
    const normalizedTag = tag.toLowerCase();

    // ハッシュタグを含む投稿を検索
    const posts = await Post.find({ hashtags: normalizedTag })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title content authorId authorName authorEmail authorImage likes likesCount commentsCount hashtags createdAt');

    const totalCount = await Post.countDocuments({ hashtags: normalizedTag });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      tag: normalizedTag,
    });
  } catch (error) {
    console.error('Error searching posts by hashtag:', error);
    return NextResponse.json(
      { error: 'Failed to search posts' },
      { status: 500 }
    );
  }
}
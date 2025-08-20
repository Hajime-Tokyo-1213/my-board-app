import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Follow from '@/models/Follow';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    await connectDB();

    const userId = params.userId;
    const currentUserId = session?.user?.id;

    const [following, total] = await Promise.all([
      Follow.getFollowing(userId, limit, skip),
      Follow.getFollowingCount(userId),
    ]);

    const followingWithStatus = await Promise.all(
      following.map(async (follow) => {
        const followingData = follow.toObject();
        
        if (currentUserId) {
          const isFollowing = await Follow.isFollowing(
            currentUserId,
            follow.following._id.toString()
          );
          
          return {
            ...followingData,
            isFollowing,
            isCurrentUser: follow.following._id.toString() === currentUserId,
          };
        }
        
        return followingData;
      })
    );

    return NextResponse.json({
      data: followingWithStatus,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Get following error:', error);
    return NextResponse.json(
      { error: 'Failed to get following' },
      { status: 500 }
    );
  }
}
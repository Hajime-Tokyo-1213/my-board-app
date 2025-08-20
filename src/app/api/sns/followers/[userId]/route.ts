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

    const [followers, total] = await Promise.all([
      Follow.getFollowers(userId, limit, skip),
      Follow.getFollowersCount(userId),
    ]);

    const followersWithStatus = await Promise.all(
      followers.map(async (follow) => {
        const followerData = follow.toObject();
        
        if (currentUserId) {
          const isFollowing = await Follow.isFollowing(
            currentUserId,
            follow.follower._id.toString()
          );
          
          return {
            ...followerData,
            isFollowing,
            isCurrentUser: follow.follower._id.toString() === currentUserId,
          };
        }
        
        return followerData;
      })
    );

    return NextResponse.json({
      data: followersWithStatus,
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
    console.error('Get followers error:', error);
    return NextResponse.json(
      { error: 'Failed to get followers' },
      { status: 500 }
    );
  }
}
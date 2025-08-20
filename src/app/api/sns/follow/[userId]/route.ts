import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Follow from '@/models/Follow';
import User from '@/models/User';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const followerId = session.user.id;
    const followingId = params.userId;

    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const follow = await Follow.followUser(followerId, followingId);

    return NextResponse.json({
      success: true,
      data: follow,
      message: 'Successfully followed user'
    });

  } catch (error: any) {
    if (error.message === 'Already following this user') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    console.error('Follow error:', error);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const followerId = session.user.id;
    const followingId = params.userId;

    const unfollowed = await Follow.unfollowUser(followerId, followingId);

    if (!unfollowed) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unfollowed user'
    });

  } catch (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    await connectDB();

    const userId = params.userId;
    const currentUserId = session?.user?.id;

    const stats = await Follow.getFollowStats(userId);

    if (currentUserId && currentUserId !== userId) {
      const [isFollowing, isFollowedBy] = await Promise.all([
        Follow.isFollowing(currentUserId, userId),
        Follow.isFollowing(userId, currentUserId),
      ]);

      return NextResponse.json({
        ...stats,
        isFollowing,
        isFollowedBy,
        isMutual: isFollowing && isFollowedBy,
      });
    }

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Get follow stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get follow stats' },
      { status: 500 }
    );
  }
}
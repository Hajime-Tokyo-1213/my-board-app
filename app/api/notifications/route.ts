import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const query: any = { userId: session.user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate('fromUserId', 'username profileImage')
      .populate('postId', 'title')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const unreadCount = await Notification.countDocuments({
      userId: session.user.id,
      read: false
    });

    return NextResponse.json({ 
      notifications,
      unreadCount 
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationIds, markAllRead } = await request.json();

    await connectDB();

    if (markAllRead) {
      await Notification.updateMany(
        { userId: session.user.id, read: false },
        { $set: { read: true } }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          userId: session.user.id 
        },
        { $set: { read: true } }
      );
    }

    const unreadCount = await Notification.countDocuments({
      userId: session.user.id,
      read: false
    });

    return NextResponse.json({ 
      success: true,
      unreadCount 
    });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
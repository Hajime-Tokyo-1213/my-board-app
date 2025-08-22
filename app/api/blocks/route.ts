import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import BlockedRelation from '@/models/BlockedRelation';

// GET: ブロックリストを取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const result = await BlockedRelation.getBlockedUsers(user._id, page, limit);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    return NextResponse.json(
      { error: 'ブロックリストの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: ユーザーをブロック
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, reason } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ブロック対象ユーザーの存在確認
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'ブロック対象のユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ブロック処理
    try {
      const blockRelation = await BlockedRelation.blockUser(
        currentUser._id,
        userId,
        reason
      );

      // 通知の作成（オプション）
      // ブロックの場合は通知しないのが一般的

      return NextResponse.json({
        message: 'ユーザーをブロックしました',
        blockedUser: {
          id: targetUser._id,
          name: targetUser.name,
          username: targetUser.username,
          blockedAt: blockRelation.createdAt,
        },
      });
    } catch (error: any) {
      if (error.message.includes('既にブロック')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'ユーザーのブロックに失敗しました' },
      { status: 500 }
    );
  }
}

// DELETE: ブロック解除
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    await dbConnect();

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const success = await BlockedRelation.unblockUser(currentUser._id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'ブロック解除に失敗しました。ブロック関係が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'ブロックを解除しました',
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'ブロック解除に失敗しました' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";
import { createFollowNotification } from "@/lib/notifications";

// POSTメソッド - フォローする
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const targetUserId = params.userId;

    // 自分自身をフォローしようとしていないかチェック
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "自分自身をフォローすることはできません" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // 既にフォローしているかチェック
    const existingFollow = await Follow.findOne({
      followerId: currentUserId,
      followingId: targetUserId
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "既にフォローしています" },
        { status: 400 }
      );
    }

    // フォロー関係を作成
    await Follow.create({
      followerId: currentUserId,
      followingId: targetUserId,
      status: "accepted"
    });

    // ユーザーのフォロー情報を更新
    const currentUser = await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetUserId },
      $inc: { followingCount: 1 }
    });

    await User.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentUserId },
      $inc: { followersCount: 1 }
    });

    // 通知を作成
    await createFollowNotification(
      targetUserId,
      currentUserId,
      currentUser?.name || "ユーザー"
    );

    return NextResponse.json({
      success: true,
      message: "フォローしました"
    });

  } catch (error) {
    console.error("フォローエラー:", error);
    return NextResponse.json(
      { error: "フォロー処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// DELETEメソッド - フォロー解除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const targetUserId = params.userId;

    // 自分自身の場合
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "自分自身のフォローを解除することはできません" },
        { status: 400 }
      );
    }

    await dbConnect();

    // フォロー関係の存在確認
    const followRelation = await Follow.findOneAndDelete({
      followerId: currentUserId,
      followingId: targetUserId
    });

    if (!followRelation) {
      return NextResponse.json(
        { error: "このユーザーをフォローしていません" },
        { status: 400 }
      );
    }

    // ユーザーのフォロー情報を更新
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetUserId },
      $inc: { followingCount: -1 }
    });

    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentUserId },
      $inc: { followersCount: -1 }
    });

    return NextResponse.json({
      success: true,
      message: "フォローを解除しました"
    });

  } catch (error) {
    console.error("フォロー解除エラー:", error);
    return NextResponse.json(
      { error: "フォロー解除処理中にエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GETメソッド - フォロー状態を確認
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "ログインが必要です" },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    const targetUserId = params.userId;

    await dbConnect();

    // ユーザーの存在確認
    const targetUser = await User.findById(targetUserId)
      .select("name email avatar bio followersCount followingCount");

    if (!targetUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロー状態を確認
    const isFollowing = await Follow.exists({
      followerId: currentUserId,
      followingId: targetUserId
    });

    // 相互フォローかどうか確認
    const isFollowedBy = await Follow.exists({
      followerId: targetUserId,
      followingId: currentUserId
    });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUserId,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        followersCount: targetUser.followersCount || 0,
        followingCount: targetUser.followingCount || 0
      },
      isFollowing: !!isFollowing,
      isFollowedBy: !!isFollowedBy,
      isMutual: !!isFollowing && !!isFollowedBy
    });

  } catch (error) {
    console.error("フォロー状態確認エラー:", error);
    return NextResponse.json(
      { error: "フォロー状態の確認中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
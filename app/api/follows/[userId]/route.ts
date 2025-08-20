import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getUserId } from "@/lib/authMiddleware";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";
import mongoose from "mongoose";

// フォロー/アンフォロー
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 認証チェック
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const currentUserId = await getUserId(req);
    if (!currentUserId) {
      return NextResponse.json(
        { error: "User not found in session" },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;

    // 自分自身をフォローしようとしていないかチェック
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    await dbConnect();

    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "follow") {
      // フォロー処理
      try {
        // Followドキュメントの作成
        await Follow.create({
          followerId: currentUserId,
          followingId: targetUserId,
          status: "accepted"
        });

        // 両方のユーザーのフォロー情報を更新
        await User.findByIdAndUpdate(currentUserId, {
          $addToSet: { following: targetUserId },
          $inc: { followingCount: 1 }
        });

        await User.findByIdAndUpdate(targetUserId, {
          $addToSet: { followers: currentUserId },
          $inc: { followersCount: 1 }
        });

        // 更新後のユーザー情報を取得
        const updatedTargetUser = await User.findById(targetUserId);

        return NextResponse.json({
          success: true,
          message: "Successfully followed user",
          following: true,
          followersCount: updatedTargetUser?.followersCount || 0,
          followingCount: updatedTargetUser?.followingCount || 0
        });
      } catch (error: any) {
        // 既にフォローしている場合
        if (error.code === 11000) {
          return NextResponse.json(
            { error: "Already following this user" },
            { status: 400 }
          );
        }
        throw error;
      }
    } else if (action === "unfollow") {
      // アンフォロー処理
      const followDoc = await Follow.findOneAndDelete({
        followerId: currentUserId,
        followingId: targetUserId
      });

      if (!followDoc) {
        return NextResponse.json(
          { error: "Not following this user" },
          { status: 400 }
        );
      }

      // 両方のユーザーのフォロー情報を更新
      await User.findByIdAndUpdate(currentUserId, {
        $pull: { following: targetUserId },
        $inc: { followingCount: -1 }
      });

      await User.findByIdAndUpdate(targetUserId, {
        $pull: { followers: currentUserId },
        $inc: { followersCount: -1 }
      });

      // 更新後のユーザー情報を取得
      const updatedTargetUser = await User.findById(targetUserId);

      return NextResponse.json({
        success: true,
        message: "Successfully unfollowed user",
        following: false,
        followersCount: updatedTargetUser?.followersCount || 0,
        followingCount: updatedTargetUser?.followingCount || 0
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'follow' or 'unfollow'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Follow/Unfollow error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// フォロー状態の確認
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // 認証チェック
    const authResult = await verifyAuth(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const currentUserId = await getUserId(req);
    if (!currentUserId) {
      return NextResponse.json(
        { error: "User not found in session" },
        { status: 401 }
      );
    }

    const targetUserId = params.userId;

    await dbConnect();

    // フォロー状態を確認
    const followDoc = await Follow.findOne({
      followerId: currentUserId,
      followingId: targetUserId,
      status: "accepted"
    });

    // ユーザー情報を取得
    const targetUser = await User.findById(targetUserId).select(
      "name email avatar bio followersCount followingCount"
    );

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 相互フォローかどうかも確認
    const reverseFollow = await Follow.findOne({
      followerId: targetUserId,
      followingId: currentUserId,
      status: "accepted"
    });

    return NextResponse.json({
      user: {
        id: targetUserId,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        bio: targetUser.bio,
        followersCount: targetUser.followersCount,
        followingCount: targetUser.followingCount
      },
      following: !!followDoc,
      followedBy: !!reverseFollow,
      isMutual: !!followDoc && !!reverseFollow
    });
  } catch (error) {
    console.error("Get follow status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
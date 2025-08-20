import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getUserId } from "@/lib/authMiddleware";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";

// フォロワー一覧を取得
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
    const targetUserId = params.userId;

    // クエリパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await dbConnect();

    // ターゲットユーザーの存在確認
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // フォロワーのIDリストを取得
    const followRelations = await Follow.find({
      followingId: targetUserId,
      status: "accepted"
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("followerId createdAt");

    // フォロワーの詳細情報を取得
    const followerIds = followRelations.map(rel => rel.followerId);
    const followers = await User.find({
      _id: { $in: followerIds }
    }).select("name email avatar bio followersCount followingCount");

    // 現在のユーザーがフォローしているかどうかを確認
    const currentUserFollowing = currentUserId ? 
      await Follow.find({
        followerId: currentUserId,
        followingId: { $in: followerIds },
        status: "accepted"
      }).select("followingId") : [];

    const followingMap = new Map(
      currentUserFollowing.map(f => [f.followingId, true])
    );

    // フォロワーリストを作成（フォロー日時順）
    const followersList = followRelations.map(rel => {
      const follower = followers.find(
        f => f._id.toString() === rel.followerId
      );
      
      if (!follower) return null;

      return {
        id: follower._id.toString(),
        name: follower.name,
        email: follower.email,
        avatar: follower.avatar,
        bio: follower.bio,
        followersCount: follower.followersCount,
        followingCount: follower.followingCount,
        isFollowing: followingMap.has(follower._id.toString()),
        followedAt: rel.createdAt
      };
    }).filter(Boolean);

    // 総数を取得
    const total = await Follow.countDocuments({
      followingId: targetUserId,
      status: "accepted"
    });

    return NextResponse.json({
      followers: followersList,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    });
  } catch (error) {
    console.error("Get followers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
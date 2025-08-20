import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, getUserId } from "@/lib/authMiddleware";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";

// フォロー中のユーザー一覧を取得
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

    // フォロー中のユーザーIDリストを取得
    const followRelations = await Follow.find({
      followerId: targetUserId,
      status: "accepted"
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("followingId createdAt");

    // フォロー中ユーザーの詳細情報を取得
    const followingIds = followRelations.map(rel => rel.followingId);
    const followingUsers = await User.find({
      _id: { $in: followingIds }
    }).select("name email avatar bio followersCount followingCount");

    // 現在のユーザーがフォローしているかどうかを確認
    const currentUserFollowing = currentUserId ? 
      await Follow.find({
        followerId: currentUserId,
        followingId: { $in: followingIds },
        status: "accepted"
      }).select("followingId") : [];

    const followingMap = new Map(
      currentUserFollowing.map(f => [f.followingId, true])
    );

    // 相互フォローかどうかを確認
    const mutualFollows = await Follow.find({
      followerId: { $in: followingIds },
      followingId: targetUserId,
      status: "accepted"
    }).select("followerId");

    const mutualMap = new Map(
      mutualFollows.map(f => [f.followerId, true])
    );

    // フォロー中リストを作成（フォロー日時順）
    const followingList = followRelations.map(rel => {
      const user = followingUsers.find(
        u => u._id.toString() === rel.followingId
      );
      
      if (!user) return null;

      const userId = user._id.toString();

      return {
        id: userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isFollowing: followingMap.has(userId),
        isMutual: mutualMap.has(userId),
        followedAt: rel.createdAt
      };
    }).filter(Boolean);

    // 総数を取得
    const total = await Follow.countDocuments({
      followerId: targetUserId,
      status: "accepted"
    });

    return NextResponse.json({
      following: followingList,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    });
  } catch (error) {
    console.error("Get following error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";

// GETメソッド - フォロワー一覧を取得
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

    // クエリパラメータを取得
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    await dbConnect();

    // ユーザーの存在確認
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }

    // フォロワーの関係を取得
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

    // 現在のユーザーがフォローしているかチェック
    const currentUserFollowing = await Follow.find({
      followerId: currentUserId,
      followingId: { $in: followerIds },
      status: "accepted"
    }).select("followingId");

    const followingMap = new Map(
      currentUserFollowing.map(f => [f.followingId.toString(), true])
    );

    // フォロワーリストを整形
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
        followersCount: follower.followersCount || 0,
        followingCount: follower.followingCount || 0,
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
      success: true,
      followers: followersList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    });

  } catch (error) {
    console.error("フォロワー一覧取得エラー:", error);
    return NextResponse.json(
      { error: "フォロワー一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Follow from "@/models/Follow";

// GETメソッド - フォロー中のユーザー一覧を取得
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

    // フォロー中の関係を取得
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

    // 現在のユーザーがフォローしているかチェック
    const currentUserFollowing = await Follow.find({
      followerId: currentUserId,
      followingId: { $in: followingIds },
      status: "accepted"
    }).select("followingId");

    const followingMap = new Map(
      currentUserFollowing.map(f => [f.followingId.toString(), true])
    );

    // 相互フォローかどうかチェック
    const mutualFollows = await Follow.find({
      followerId: { $in: followingIds },
      followingId: targetUserId,
      status: "accepted"
    }).select("followerId");

    const mutualMap = new Map(
      mutualFollows.map(f => [f.followerId.toString(), true])
    );

    // フォロー中リストを整形
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
        followersCount: user.followersCount || 0,
        followingCount: user.followingCount || 0,
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
      success: true,
      following: followingList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + limit < total
      }
    });

  } catch (error) {
    console.error("フォロー中一覧取得エラー:", error);
    return NextResponse.json(
      { error: "フォロー中一覧の取得中にエラーが発生しました" },
      { status: 500 }
    );
  }
}
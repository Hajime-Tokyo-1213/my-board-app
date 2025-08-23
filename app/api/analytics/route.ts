import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Analytics from '@/models/Analytics';
import Post from '@/models/Post';
import User from '@/models/User';
import Follow from '@/models/Follow';
import Comment from '@/models/Comment';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // URLからクエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';
    const period = searchParams.get('period') || '30d';
    
    // ユーザー情報を取得
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id;

    switch (type) {
      case 'stats':
        return await getBasicStats(userId);
      
      case 'growth':
        return await getGrowthData(userId, period);
      
      case 'popular-posts':
        return await getPopularPosts(userId);
      
      case 'best-times':
        return await getBestPostingTimes(userId);
      
      case 'insights':
        return await getInsights(userId);
      
      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 基本統計情報を取得
async function getBasicStats(userId: mongoose.Types.ObjectId) {
  try {
    // 現在のフォロワー数とフォロー数を取得
    const [followersCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: userId }),
      Follow.countDocuments({ follower: userId })
    ]);

    // 投稿統計を取得
    const posts = await Post.find({ author: userId }).lean();
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
    
    // コメント数を取得
    const postIds = posts.map(p => p._id);
    const totalComments = await Comment.countDocuments({ post: { $in: postIds } });

    // エンゲージメント率を計算
    const totalEngagements = totalLikes + totalComments;
    const engagementRate = totalPosts > 0 
      ? ((totalEngagements / (totalPosts * Math.max(followersCount, 1))) * 100).toFixed(2)
      : 0;

    // 前期間との比較（7日前のデータと比較）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const previousAnalytics = await Analytics.findOne({
      userId,
      date: { $lte: sevenDaysAgo }
    }).sort({ date: -1 });

    let periodComparison = {
      followersChange: 0,
      postsChange: 0,
      engagementChange: 0
    };

    if (previousAnalytics) {
      periodComparison = {
        followersChange: ((followersCount - previousAnalytics.metrics.followers) / Math.max(previousAnalytics.metrics.followers, 1)) * 100,
        postsChange: ((totalPosts - previousAnalytics.metrics.totalPosts) / Math.max(previousAnalytics.metrics.totalPosts, 1)) * 100,
        engagementChange: Number(engagementRate) - previousAnalytics.metrics.engagementRate
      };
    }

    // 現在のデータを保存（日次集計用）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Analytics.findOneAndUpdate(
      { userId, date: today },
      {
        userId,
        date: today,
        metrics: {
          followers: followersCount,
          following: followingCount,
          totalPosts,
          totalLikes,
          totalComments,
          totalViews: 0, // TODO: ビュー数の実装
          engagementRate: Number(engagementRate)
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      followers: followersCount,
      following: followingCount,
      totalPosts,
      totalLikes,
      totalComments,
      engagementRate: Number(engagementRate),
      periodComparison
    });
  } catch (error) {
    console.error('Error getting basic stats:', error);
    throw error;
  }
}

// 成長データを取得
async function getGrowthData(userId: mongoose.Types.ObjectId, period: string) {
  try {
    const days = parseInt(period) || 30;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Analytics コレクションから履歴データを取得
    const analyticsData = await Analytics.find({
      userId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).lean();

    // データが不足している場合は、現在のデータから補完
    if (analyticsData.length === 0) {
      // 現在のデータを取得して返す
      const currentStats = await getBasicStats(userId);
      const currentData = await currentStats.json();
      
      return NextResponse.json({
        data: [{
          date: new Date().toISOString().split('T')[0],
          followers: currentData.followers,
          posts: currentData.totalPosts,
          engagement: currentData.engagementRate,
          likes: currentData.totalLikes
        }]
      });
    }

    // データをフォーマット
    const formattedData = analyticsData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      followers: item.metrics.followers,
      posts: item.metrics.totalPosts,
      engagement: item.metrics.engagementRate,
      likes: item.metrics.totalLikes
    }));

    return NextResponse.json({ data: formattedData });
  } catch (error) {
    console.error('Error getting growth data:', error);
    throw error;
  }
}

// 人気投稿を取得
async function getPopularPosts(userId: mongoose.Types.ObjectId) {
  try {
    const posts = await Post.find({ author: userId })
      .sort({ likes: -1 })
      .limit(10)
      .populate('author', 'username profileImage')
      .lean();

    const popularPosts = posts.map(post => {
      const likesCount = post.likes?.length || 0;
      const commentsCount = 0; // TODO: コメント数の取得
      const engagementScore = (likesCount * 1 + commentsCount * 2) / Math.max(1, likesCount + commentsCount);

      return {
        id: post._id.toString(),
        title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
        content: post.content,
        thumbnail: post.images?.[0] || null,
        likes: likesCount,
        comments: commentsCount,
        engagementScore: engagementScore.toFixed(1),
        createdAt: post.createdAt
      };
    });

    return NextResponse.json({ posts: popularPosts });
  } catch (error) {
    console.error('Error getting popular posts:', error);
    throw error;
  }
}

// 最適な投稿時間を分析
async function getBestPostingTimes(userId: mongoose.Types.ObjectId) {
  try {
    const posts = await Post.find({ author: userId }).lean();
    
    // 時間別アクティビティを集計
    const hourlyActivity: { [key: string]: number } = {};
    const dayHourMap: { [key: string]: { [key: number]: number } } = {
      'Sunday': {},
      'Monday': {},
      'Tuesday': {},
      'Wednesday': {},
      'Thursday': {},
      'Friday': {},
      'Saturday': {}
    };

    posts.forEach(post => {
      const date = new Date(post.createdAt);
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
      const hour = date.getHours();
      const engagement = (post.likes?.length || 0) + 1; // +1 for the post itself

      if (!dayHourMap[dayName][hour]) {
        dayHourMap[dayName][hour] = 0;
      }
      dayHourMap[dayName][hour] += engagement;

      const key = `${dayName}-${hour}`;
      hourlyActivity[key] = (hourlyActivity[key] || 0) + engagement;
    });

    // ヒートマップデータを生成
    const heatmap: any[] = [];
    Object.keys(dayHourMap).forEach(day => {
      for (let hour = 0; hour < 24; hour++) {
        heatmap.push({
          day,
          hour,
          activity: dayHourMap[day][hour] || 0
        });
      }
    });

    // 最も活発な時間を特定
    const sortedActivity = Object.entries(hourlyActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const recommendations = [
      `最も活発な時間: ${sortedActivity[0]?.[0]?.replace('-', ' ') || 'データ不足'}`,
      '継続的な投稿が重要です'
    ];

    return NextResponse.json({ heatmap, recommendations });
  } catch (error) {
    console.error('Error getting best posting times:', error);
    throw error;
  }
}

// インサイトを生成
async function getInsights(userId: mongoose.Types.ObjectId) {
  try {
    const [stats, growth, popular] = await Promise.all([
      getBasicStats(userId),
      getGrowthData(userId, '7'),
      getPopularPosts(userId)
    ]);

    const statsData = await stats.json();
    const growthData = await growth.json();
    const popularData = await popular.json();

    const insights = [];

    // エンゲージメント率に基づくインサイト
    if (statsData.engagementRate > 5) {
      insights.push({
        type: 'success',
        message: '素晴らしいエンゲージメント率です！この調子を維持しましょう。'
      });
    } else if (statsData.engagementRate < 2) {
      insights.push({
        type: 'warning',
        message: 'エンゲージメント率が低めです。投稿内容や投稿時間を見直してみましょう。'
      });
    }

    // フォロワー成長に基づくインサイト
    if (statsData.periodComparison.followersChange > 10) {
      insights.push({
        type: 'success',
        message: `フォロワーが${statsData.periodComparison.followersChange.toFixed(1)}%増加しています！`
      });
    } else if (statsData.periodComparison.followersChange < -5) {
      insights.push({
        type: 'warning',
        message: 'フォロワーが減少傾向です。コンテンツ戦略を見直しましょう。'
      });
    }

    // 投稿頻度に基づくインサイト
    if (statsData.totalPosts < 5) {
      insights.push({
        type: 'info',
        message: '投稿頻度を上げることで、より多くのエンゲージメントが期待できます。'
      });
    }

    // 人気投稿に基づくインサイト
    if (popularData.posts.length > 0) {
      const topPost = popularData.posts[0];
      if (topPost.likes > 50) {
        insights.push({
          type: 'success',
          message: `「${topPost.title}」が大きな反響を呼んでいます！同様のコンテンツを検討してみましょう。`
        });
      }
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('Error generating insights:', error);
    throw error;
  }
}
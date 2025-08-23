import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  metrics: {
    followers: number;
    following: number;
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
    engagementRate: number;
  };
  hourlyActivity: Map<number, number>;
  topHashtags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    metrics: {
      followers: { type: Number, default: 0 },
      following: { type: Number, default: 0 },
      totalPosts: { type: Number, default: 0 },
      totalLikes: { type: Number, default: 0 },
      totalComments: { type: Number, default: 0 },
      totalViews: { type: Number, default: 0 },
      engagementRate: { type: Number, default: 0 },
    },
    hourlyActivity: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    topHashtags: [{
      type: String,
    }],
  },
  {
    timestamps: true,
  }
);

// 複合インデックス
AnalyticsSchema.index({ userId: 1, date: -1 }, { unique: true });

// 静的メソッド: ユーザーの統計を集計
AnalyticsSchema.statics.aggregateUserStats = async function(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        avgFollowers: { $avg: '$metrics.followers' },
        avgEngagement: { $avg: '$metrics.engagementRate' },
        totalPosts: { $sum: '$metrics.totalPosts' },
        totalLikes: { $sum: '$metrics.totalLikes' },
        totalComments: { $sum: '$metrics.totalComments' },
      }
    }
  ]);
};

// 静的メソッド: 成長データを取得
AnalyticsSchema.statics.getGrowthData = async function(
  userId: string,
  days: number = 30
) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $sort: { date: 1 }
    },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        followers: '$metrics.followers',
        posts: '$metrics.totalPosts',
        engagement: '$metrics.engagementRate',
        likes: '$metrics.totalLikes',
      }
    }
  ]);
};

const Analytics: Model<IAnalytics> = 
  mongoose.models.Analytics || mongoose.model<IAnalytics>('Analytics', AnalyticsSchema);

export default Analytics;
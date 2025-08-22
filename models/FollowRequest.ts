import mongoose, { Document, Schema, Types } from 'mongoose';

// フォローリクエストのインターフェース
export interface IFollowRequest extends Document {
  requester: Types.ObjectId;      // リクエスト送信者
  recipient: Types.ObjectId;      // リクエスト受信者
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message?: string;                // フォローリクエストメッセージ
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;                // 有効期限（30日後）
}

// フォローリクエストのスキーマ
const followRequestSchema = new Schema<IFollowRequest>({
  requester: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
    index: true,
  },
  message: {
    type: String,
    maxlength: 200,
    trim: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
    index: { expireAfterSeconds: 0 }, // TTLインデックス
  },
}, {
  timestamps: true,
});

// 複合インデックス
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
followRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });
followRequestSchema.index({ requester: 1, status: 1, createdAt: -1 });

// スタティックメソッド
followRequestSchema.statics = {
  // フォローリクエストを作成
  async createRequest(
    requesterId: string | Types.ObjectId,
    recipientId: string | Types.ObjectId,
    message?: string
  ): Promise<IFollowRequest> {
    // 自分自身にはリクエストできない
    if (requesterId.toString() === recipientId.toString()) {
      throw new Error('自分自身にフォローリクエストを送ることはできません');
    }

    // ブロックチェック
    const BlockedRelation = mongoose.model('BlockedRelation');
    const isBlocked = await BlockedRelation.isBlocked(requesterId, recipientId);
    if (isBlocked) {
      throw new Error('このユーザーとの関係はブロックされています');
    }

    // 既存のリクエストをチェック
    const existing = await this.findOne({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    });

    if (existing) {
      throw new Error('既にフォローリクエストを送信しています');
    }

    // 既にフォローしているかチェック
    const User = mongoose.model('User');
    const requester = await User.findById(requesterId);
    if (requester?.following?.includes(recipientId as any)) {
      throw new Error('既にこのユーザーをフォローしています');
    }

    try {
      const request = await this.create({
        requester: requesterId,
        recipient: recipientId,
        message,
      });

      // 受信者の pendingFollowers に追加
      await User.updateOne(
        { _id: recipientId },
        { $addToSet: { pendingFollowers: requesterId } }
      );

      // 送信者の pendingFollowing に追加
      await User.updateOne(
        { _id: requesterId },
        { $addToSet: { pendingFollowing: recipientId } }
      );

      return request;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error('フォローリクエストは既に存在します');
      }
      throw error;
    }
  },

  // フォローリクエストを承認
  async approveRequest(requestId: string | Types.ObjectId): Promise<IFollowRequest> {
    const request = await this.findById(requestId);
    if (!request) {
      throw new Error('フォローリクエストが見つかりません');
    }

    if (request.status !== 'pending') {
      throw new Error('このリクエストは既に処理されています');
    }

    request.status = 'approved';
    await request.save();

    // フォロー関係を作成
    const User = mongoose.model('User');
    const Follow = mongoose.model('Follow');

    // フォロー関係を追加
    await Follow.create({
      follower: request.requester,
      following: request.recipient,
    });

    // ユーザーのフォロー情報を更新
    await User.updateOne(
      { _id: request.requester },
      { 
        $addToSet: { following: request.recipient },
        $pull: { pendingFollowing: request.recipient },
        $inc: { followingCount: 1 }
      }
    );

    await User.updateOne(
      { _id: request.recipient },
      { 
        $addToSet: { followers: request.requester },
        $pull: { pendingFollowers: request.requester },
        $inc: { followersCount: 1 }
      }
    );

    return request;
  },

  // フォローリクエストを拒否
  async rejectRequest(requestId: string | Types.ObjectId): Promise<IFollowRequest> {
    const request = await this.findById(requestId);
    if (!request) {
      throw new Error('フォローリクエストが見つかりません');
    }

    if (request.status !== 'pending') {
      throw new Error('このリクエストは既に処理されています');
    }

    request.status = 'rejected';
    await request.save();

    // ペンディングリストから削除
    const User = mongoose.model('User');
    await User.updateOne(
      { _id: request.recipient },
      { $pull: { pendingFollowers: request.requester } }
    );

    await User.updateOne(
      { _id: request.requester },
      { $pull: { pendingFollowing: request.recipient } }
    );

    return request;
  },

  // フォローリクエストをキャンセル
  async cancelRequest(
    requesterId: string | Types.ObjectId,
    recipientId: string | Types.ObjectId
  ): Promise<boolean> {
    const request = await this.findOne({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    });

    if (!request) {
      return false;
    }

    request.status = 'cancelled';
    await request.save();

    // ペンディングリストから削除
    const User = mongoose.model('User');
    await User.updateOne(
      { _id: recipientId },
      { $pull: { pendingFollowers: requesterId } }
    );

    await User.updateOne(
      { _id: requesterId },
      { $pull: { pendingFollowing: recipientId } }
    );

    return true;
  },

  // 受信したフォローリクエスト一覧を取得
  async getReceivedRequests(
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    requests: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.find({ recipient: userId, status: 'pending' })
        .populate('requester', 'name username avatar bio followersCount isVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments({ recipient: userId, status: 'pending' }),
    ]);

    // 共通のフォロワーを取得
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('followers');
    const userFollowers = user?.followers || [];

    const formattedRequests = await Promise.all(
      requests.map(async (req: any) => {
        const requesterFollowers = await User.findById(req.requester._id)
          .select('followers')
          .lean();
        
        const mutualFollowers = userFollowers.filter((f: any) =>
          requesterFollowers?.followers?.includes(f)
        );

        return {
          id: req._id,
          requester: {
            id: req.requester._id,
            name: req.requester.name,
            username: req.requester.username,
            avatar: req.requester.avatar,
            bio: req.requester.bio,
            followersCount: req.requester.followersCount,
            isVerified: req.requester.isVerified,
          },
          message: req.message,
          createdAt: req.createdAt,
          mutualFollowers: mutualFollowers.slice(0, 3),
        };
      })
    );

    return {
      requests: formattedRequests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // 送信したフォローリクエスト一覧を取得
  async getSentRequests(
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    requests: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.find({ requester: userId, status: 'pending' })
        .populate('recipient', 'name username avatar bio isPrivate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments({ requester: userId, status: 'pending' }),
    ]);

    const formattedRequests = requests.map((req: any) => ({
      id: req._id,
      recipient: {
        id: req.recipient._id,
        name: req.recipient.name,
        username: req.recipient.username,
        avatar: req.recipient.avatar,
        bio: req.recipient.bio,
        isPrivate: req.recipient.isPrivate,
      },
      message: req.message,
      createdAt: req.createdAt,
    }));

    return {
      requests: formattedRequests,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // 複数のリクエストを一括承認
  async bulkApprove(requestIds: string[]): Promise<number> {
    let approvedCount = 0;

    for (const requestId of requestIds) {
      try {
        await this.approveRequest(requestId);
        approvedCount++;
      } catch (error) {
        console.error(`Failed to approve request ${requestId}:`, error);
      }
    }

    return approvedCount;
  },

  // 複数のリクエストを一括拒否
  async bulkReject(requestIds: string[]): Promise<number> {
    let rejectedCount = 0;

    for (const requestId of requestIds) {
      try {
        await this.rejectRequest(requestId);
        rejectedCount++;
      } catch (error) {
        console.error(`Failed to reject request ${requestId}:`, error);
      }
    }

    return rejectedCount;
  },
};

// インスタンスメソッド
followRequestSchema.methods = {
  // リクエストの詳細情報を取得
  async getDetails() {
    await this.populate([
      { path: 'requester', select: 'name username avatar bio followersCount' },
      { path: 'recipient', select: 'name username avatar isPrivate' },
    ]);
    return this;
  },
};

// モデルのエクスポート
const FollowRequest = mongoose.models.FollowRequest || 
  mongoose.model<IFollowRequest>('FollowRequest', followRequestSchema);

export default FollowRequest;
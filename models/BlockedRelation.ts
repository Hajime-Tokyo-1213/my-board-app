import mongoose, { Document, Schema, Types } from 'mongoose';

// ブロック関係のインターフェース
export interface IBlockedRelation extends Document {
  blocker: Types.ObjectId;        // ブロックした側
  blocked: Types.ObjectId;        // ブロックされた側
  reason?: 'spam' | 'harassment' | 'inappropriate' | 'other';  // ブロック理由
  reportId?: Types.ObjectId;      // 通報IDとの関連
  createdAt: Date;
  updatedAt: Date;
}

// ブロック関係のスキーマ
const blockedRelationSchema = new Schema<IBlockedRelation>({
  blocker: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  blocked: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  reason: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate', 'other'],
  },
  reportId: {
    type: Schema.Types.ObjectId,
    ref: 'Report',
  },
}, {
  timestamps: true,
});

// 複合ユニークインデックス（同じユーザーを二重にブロックできない）
blockedRelationSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// 逆引き用インデックス（誰にブロックされているか）
blockedRelationSchema.index({ blocked: 1, blocker: 1 });

// スタティックメソッド
blockedRelationSchema.statics = {
  // ユーザーをブロック
  async blockUser(
    blockerId: string | Types.ObjectId,
    blockedId: string | Types.ObjectId,
    reason?: string,
    reportId?: string
  ): Promise<IBlockedRelation> {
    // 自分自身はブロックできない
    if (blockerId.toString() === blockedId.toString()) {
      throw new Error('自分自身をブロックすることはできません');
    }

    try {
      const blockRelation = await this.create({
        blocker: blockerId,
        blocked: blockedId,
        reason,
        reportId,
      });

      // 相互フォローを解除
      const User = mongoose.model('User');
      await User.updateOne(
        { _id: blockerId },
        { 
          $pull: { 
            following: blockedId,
            followers: blockedId,
          },
          $addToSet: { blockedUsers: blockedId }
        }
      );
      
      await User.updateOne(
        { _id: blockedId },
        { 
          $pull: { 
            following: blockerId,
            followers: blockerId,
          },
          $addToSet: { blockedBy: blockerId }
        }
      );

      return blockRelation;
    } catch (error: any) {
      if (error.code === 11000) {
        throw new Error('このユーザーは既にブロックされています');
      }
      throw error;
    }
  },

  // ブロック解除
  async unblockUser(
    blockerId: string | Types.ObjectId,
    blockedId: string | Types.ObjectId
  ): Promise<boolean> {
    const result = await this.deleteOne({
      blocker: blockerId,
      blocked: blockedId,
    });

    if (result.deletedCount > 0) {
      // ブロックリストから削除
      const User = mongoose.model('User');
      await User.updateOne(
        { _id: blockerId },
        { $pull: { blockedUsers: blockedId } }
      );
      
      await User.updateOne(
        { _id: blockedId },
        { $pull: { blockedBy: blockerId } }
      );

      return true;
    }

    return false;
  },

  // ブロック状態の確認
  async isBlocked(
    userId1: string | Types.ObjectId,
    userId2: string | Types.ObjectId
  ): Promise<boolean> {
    const count = await this.countDocuments({
      $or: [
        { blocker: userId1, blocked: userId2 },
        { blocker: userId2, blocked: userId1 },
      ],
    });
    return count > 0;
  },

  // ユーザーがブロックしているかチェック
  async hasBlocked(
    blockerId: string | Types.ObjectId,
    blockedId: string | Types.ObjectId
  ): Promise<boolean> {
    const count = await this.countDocuments({
      blocker: blockerId,
      blocked: blockedId,
    });
    return count > 0;
  },

  // ブロックリストを取得
  async getBlockedUsers(
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [relations, total] = await Promise.all([
      this.find({ blocker: userId })
        .populate('blocked', 'name username avatar bio')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments({ blocker: userId }),
    ]);

    const users = relations.map((rel: any) => ({
      id: rel.blocked._id,
      name: rel.blocked.name,
      username: rel.blocked.username,
      avatar: rel.blocked.avatar,
      bio: rel.blocked.bio,
      blockedAt: rel.createdAt,
      reason: rel.reason,
    }));

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // ユーザーをブロックしている人のリストを取得
  async getBlockedByUsers(
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    users: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [relations, total] = await Promise.all([
      this.find({ blocked: userId })
        .populate('blocker', 'name username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.countDocuments({ blocked: userId }),
    ]);

    const users = relations.map((rel: any) => ({
      id: rel.blocker._id,
      name: rel.blocker.name,
      username: rel.blocker.username,
      avatar: rel.blocker.avatar,
      blockedAt: rel.createdAt,
    }));

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  // ブロック統計を取得
  async getBlockStats(userId: string | Types.ObjectId): Promise<{
    blocking: number;
    blockedBy: number;
  }> {
    const [blocking, blockedBy] = await Promise.all([
      this.countDocuments({ blocker: userId }),
      this.countDocuments({ blocked: userId }),
    ]);

    return {
      blocking,
      blockedBy,
    };
  },
};

// インスタンスメソッド
blockedRelationSchema.methods = {
  // ブロック情報の詳細を取得
  async getDetails() {
    await this.populate([
      { path: 'blocker', select: 'name username avatar' },
      { path: 'blocked', select: 'name username avatar' },
    ]);
    return this;
  },
};

// モデルのエクスポート
const BlockedRelation = mongoose.models.BlockedRelation || 
  mongoose.model<IBlockedRelation>('BlockedRelation', blockedRelationSchema);

export default BlockedRelation;
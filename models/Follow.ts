import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
  followerId: string;
  followingId: string;
  status: 'pending' | 'accepted';
  createdAt: Date;
  updatedAt: Date;
}

const FollowSchema = new Schema<IFollow>({
  followerId: {
    type: String,
    required: true,
    index: true
  },
  followingId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'accepted',
    required: true
  }
}, {
  timestamps: true
});

// 複合インデックス（同じユーザーを複数回フォローできないように）
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// フォロー関係の高速検索用インデックス
FollowSchema.index({ followingId: 1, status: 1 });
FollowSchema.index({ followerId: 1, status: 1 });
FollowSchema.index({ createdAt: -1 });

// 自分自身をフォローできないようにする
FollowSchema.pre('save', function(next) {
  if (this.followerId === this.followingId) {
    next(new Error('Cannot follow yourself'));
  }
  next();
});

const Follow = mongoose.models.Follow || mongoose.model<IFollow>('Follow', FollowSchema);

export default Follow;
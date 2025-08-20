import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFollow extends Document {
  follower: mongoose.Types.ObjectId;
  following: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollowMethods {
  isValid(): boolean;
}

export interface FollowModel extends Model<IFollow, {}, IFollowMethods> {
  followUser(followerId: string, followingId: string): Promise<IFollow>;
  unfollowUser(followerId: string, followingId: string): Promise<boolean>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
  areMutualFollowers(userId1: string, userId2: string): Promise<boolean>;
  getFollowers(userId: string, limit?: number, skip?: number): Promise<IFollow[]>;
  getFollowing(userId: string, limit?: number, skip?: number): Promise<IFollow[]>;
  getFollowersCount(userId: string): Promise<number>;
  getFollowingCount(userId: string): Promise<number>;
  getFollowStats(userId: string): Promise<{
    followersCount: number;
    followingCount: number;
    isFollowingBack?: boolean;
  }>;
}

const followSchema = new Schema<IFollow, FollowModel, IFollowMethods>({
  follower: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  following: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, follower: 1 });
followSchema.index({ createdAt: -1 });

followSchema.pre('save', async function(next) {
  if (this.follower.equals(this.following)) {
    return next(new Error('Users cannot follow themselves'));
  }
  next();
});

followSchema.methods.isValid = function(): boolean {
  return !this.follower.equals(this.following);
};

followSchema.statics.followUser = async function(
  followerId: string, 
  followingId: string
): Promise<IFollow> {
  if (followerId === followingId) {
    throw new Error('Users cannot follow themselves');
  }

  const existingFollow = await this.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existingFollow) {
    throw new Error('Already following this user');
  }

  const follow = await this.create({
    follower: followerId,
    following: followingId,
  });

  const User = mongoose.model('User');
  await User.findByIdAndUpdate(followerId, {
    $inc: { followingCount: 1 }
  });
  await User.findByIdAndUpdate(followingId, {
    $inc: { followersCount: 1 }
  });

  return follow;
};

followSchema.statics.unfollowUser = async function(
  followerId: string, 
  followingId: string
): Promise<boolean> {
  const result = await this.findOneAndDelete({
    follower: followerId,
    following: followingId,
  });

  if (result) {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 }
    });
    await User.findByIdAndUpdate(followingId, {
      $inc: { followersCount: -1 }
    });
    return true;
  }

  return false;
};

followSchema.statics.isFollowing = async function(
  followerId: string, 
  followingId: string
): Promise<boolean> {
  const follow = await this.findOne({
    follower: followerId,
    following: followingId,
  });
  return !!follow;
};

followSchema.statics.areMutualFollowers = async function(
  userId1: string, 
  userId2: string
): Promise<boolean> {
  const [follow1, follow2] = await Promise.all([
    this.findOne({ follower: userId1, following: userId2 }),
    this.findOne({ follower: userId2, following: userId1 }),
  ]);
  
  return !!(follow1 && follow2);
};

followSchema.statics.getFollowers = async function(
  userId: string, 
  limit: number = 20, 
  skip: number = 0
): Promise<IFollow[]> {
  return this.find({ following: userId })
    .populate('follower', 'name email bio avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .exec();
};

followSchema.statics.getFollowing = async function(
  userId: string, 
  limit: number = 20, 
  skip: number = 0
): Promise<IFollow[]> {
  return this.find({ follower: userId })
    .populate('following', 'name email bio avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .exec();
};

followSchema.statics.getFollowersCount = async function(userId: string): Promise<number> {
  return this.countDocuments({ following: userId });
};

followSchema.statics.getFollowingCount = async function(userId: string): Promise<number> {
  return this.countDocuments({ follower: userId });
};

followSchema.statics.getFollowStats = async function(
  userId: string
): Promise<{ followersCount: number; followingCount: number; isFollowingBack?: boolean }> {
  const [followersCount, followingCount] = await Promise.all([
    this.countDocuments({ following: userId }),
    this.countDocuments({ follower: userId }),
  ]);

  return {
    followersCount,
    followingCount,
  };
};

export default mongoose.models.Follow || mongoose.model<IFollow, FollowModel>('Follow', followSchema);
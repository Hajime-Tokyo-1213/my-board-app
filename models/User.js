import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    maxlength: 30,
    match: /^[a-zA-Z0-9_]+$/,
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  avatar: {
    type: String,
    default: null,
  },
  coverImage: {
    type: String,
    default: null,
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  followersCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Date,
    default: null,
  },
  verificationToken: {
    type: String,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ followersCount: -1 });
userSchema.index({ createdAt: -1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.followUser = async function(userIdToFollow) {
  const User = this.constructor;
  
  if (this._id.equals(userIdToFollow)) {
    throw new Error('Users cannot follow themselves');
  }
  
  const userToFollow = await User.findById(userIdToFollow);
  if (!userToFollow) {
    throw new Error('User not found');
  }
  
  const isAlreadyFollowing = this.following.some(id => 
    id.equals(userIdToFollow)
  );
  
  if (isAlreadyFollowing) {
    throw new Error('Already following this user');
  }
  
  this.following.push(userIdToFollow);
  this.followingCount = this.following.length;
  
  userToFollow.followers.push(this._id);
  userToFollow.followersCount = userToFollow.followers.length;
  
  await Promise.all([
    this.save(),
    userToFollow.save()
  ]);
  
  return {
    success: true,
    message: 'Successfully followed user',
    followingCount: this.followingCount,
    targetFollowersCount: userToFollow.followersCount
  };
};

userSchema.methods.unfollowUser = async function(userIdToUnfollow) {
  const User = this.constructor;
  
  const userToUnfollow = await User.findById(userIdToUnfollow);
  if (!userToUnfollow) {
    throw new Error('User not found');
  }
  
  const followingIndex = this.following.findIndex(id => 
    id.equals(userIdToUnfollow)
  );
  
  if (followingIndex === -1) {
    throw new Error('Not following this user');
  }
  
  this.following.splice(followingIndex, 1);
  this.followingCount = this.following.length;
  
  const followerIndex = userToUnfollow.followers.findIndex(id => 
    id.equals(this._id)
  );
  
  if (followerIndex !== -1) {
    userToUnfollow.followers.splice(followerIndex, 1);
    userToUnfollow.followersCount = userToUnfollow.followers.length;
  }
  
  await Promise.all([
    this.save(),
    userToUnfollow.save()
  ]);
  
  return {
    success: true,
    message: 'Successfully unfollowed user',
    followingCount: this.followingCount,
    targetFollowersCount: userToUnfollow.followersCount
  };
};

userSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.equals(userId));
};

userSchema.methods.isFollowedBy = function(userId) {
  return this.followers.some(id => id.equals(userId));
};

userSchema.methods.getFollowRelationship = async function(userId) {
  const User = this.constructor;
  const otherUser = await User.findById(userId);
  
  if (!otherUser) {
    return {
      isFollowing: false,
      isFollowedBy: false,
      isMutual: false
    };
  }
  
  const isFollowing = this.isFollowing(userId);
  const isFollowedBy = this.isFollowedBy(userId);
  
  return {
    isFollowing,
    isFollowedBy,
    isMutual: isFollowing && isFollowedBy
  };
};

userSchema.statics.getFollowers = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const user = await this.findById(userId)
    .populate({
      path: 'followers',
      select: 'name username bio avatar followersCount followingCount',
      options: {
        limit,
        skip
      }
    });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    followers: user.followers,
    total: user.followersCount,
    page,
    limit,
    hasMore: user.followersCount > (page * limit)
  };
};

userSchema.statics.getFollowing = async function(userId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (page - 1) * limit;
  
  const user = await this.findById(userId)
    .populate({
      path: 'following',
      select: 'name username bio avatar followersCount followingCount',
      options: {
        limit,
        skip
      }
    });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  return {
    following: user.following,
    total: user.followingCount,
    page,
    limit,
    hasMore: user.followingCount > (page * limit)
  };
};

userSchema.statics.getMutualFollowers = async function(userId1, userId2) {
  const [user1, user2] = await Promise.all([
    this.findById(userId1).select('followers'),
    this.findById(userId2).select('followers')
  ]);
  
  if (!user1 || !user2) {
    throw new Error('One or both users not found');
  }
  
  const mutualIds = user1.followers.filter(id => 
    user2.followers.some(otherId => id.equals(otherId))
  );
  
  const mutualFollowers = await this.find({
    _id: { $in: mutualIds }
  }).select('name username bio avatar followersCount followingCount');
  
  return mutualFollowers;
};

userSchema.statics.getSuggestedUsers = async function(userId, limit = 10) {
  const user = await this.findById(userId).select('following');
  if (!user) {
    throw new Error('User not found');
  }
  
  const followingIds = user.following;
  followingIds.push(userId);
  
  const suggestions = await this.aggregate([
    {
      $match: {
        _id: { $nin: followingIds },
        isPrivate: false
      }
    },
    {
      $sample: { size: limit * 2 }
    },
    {
      $sort: { followersCount: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        name: 1,
        username: 1,
        bio: 1,
        avatar: 1,
        followersCount: 1,
        followingCount: 1
      }
    }
  ]);
  
  return suggestions;
};

export default mongoose.models.User || mongoose.model('User', userSchema);
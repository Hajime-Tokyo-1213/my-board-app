import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IPrivacySettings, privacySettingsSchema, defaultPrivacySettings } from './PrivacySettings';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
  profileImage?: string;
  followers: string[];
  following: string[];
  followersCount: number;
  followingCount: number;
  postsCount?: number;
  searchableText?: string;
  searchRank?: number;
  tags?: string[];
  language?: string[];
  lastActiveAt?: Date;
  emailVerified: Date | null;
  verificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  
  // プライバシー設定
  privacySettings: IPrivacySettings;
  isPrivate?: boolean; // 非公開アカウント（privacySettings.isPrivate のショートカット）
  
  // ブロック・ミュート
  blockedUsers: mongoose.Types.ObjectId[];
  blockedBy: mongoose.Types.ObjectId[];
  mutedUsers: mongoose.Types.ObjectId[];
  
  // フォローリクエスト
  pendingFollowers: mongoose.Types.ObjectId[];  // 承認待ちのフォロワー
  pendingFollowing: mongoose.Types.ObjectId[];  // 承認待ちのフォロー
  
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

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
    trim: true,
    lowercase: true,
    maxlength: 30,
  },
  displayName: {
    type: String,
    trim: true,
    maxlength: 50,
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
  profileImage: {
    type: String,
    default: null,
  },
  followers: [{
    type: String,
    ref: 'User'
  }],
  following: [{
    type: String,
    ref: 'User'
  }],
  followersCount: {
    type: Number,
    default: 0,
    min: 0
  },
  followingCount: {
    type: Number,
    default: 0,
    min: 0
  },
  postsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  searchableText: {
    type: String,
    default: ''
  },
  searchRank: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  language: [{
    type: String,
    enum: ['ja', 'en', 'zh', 'ko', 'other'],
    default: ['ja']
  }],
  lastActiveAt: {
    type: Date,
    default: Date.now
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
  
  // プライバシー設定
  privacySettings: {
    type: privacySettingsSchema,
    default: () => defaultPrivacySettings,
  },
  isPrivate: {
    type: Boolean,
    default: false,
  },
  
  // ブロック・ミュート
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  blockedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  mutedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // フォローリクエスト
  pendingFollowers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pendingFollowing: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
}, {
  timestamps: true,
});

// パスワードのハッシュ化
userSchema.pre('save', async function(next) {
  // searchableTextを自動生成
  const searchableFields = [
    this.name,
    this.username,
    this.displayName,
    this.bio,
    this.email.split('@')[0] // メールアドレスのローカル部分
  ].filter(Boolean).join(' ');
  
  this.searchableText = searchableFields.toLowerCase();
  
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// インデックスの作成
userSchema.index({ searchableText: 'text' });
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ searchRank: -1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ followersCount: -1 });

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
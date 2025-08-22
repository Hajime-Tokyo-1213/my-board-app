import mongoose from 'mongoose';

const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
    trim: true
  },
  authorId: {
    type: String,
    required: true,
    index: true
  },
  authorName: {
    type: String,
    required: true
  },
  authorEmail: {
    type: String,
    required: true
  },
  authorImage: {
    type: String,
    default: null
  },
  likes: [{
    type: String
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  hashtags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  images: [{
    id: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnailUrl: {
      type: String,
      required: true
    },
    mediumUrl: {
      type: String,
      required: true
    },
    largeUrl: {
      type: String,
      required: true
    }
  }],
  
  // プライバシー設定
  visibility: {
    type: String,
    enum: ['public', 'followers', 'mutual', 'private'],
    default: 'public',
    index: true
  },
  allowComments: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone'
  },
  allowShares: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone'
  },
  allowLikes: {
    type: String,
    enum: ['everyone', 'followers', 'mutual', 'none'],
    default: 'everyone'
  },
  
  // 表示制限
  blockedFromUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // 承認済みユーザー（非公開投稿の場合）
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// インデックスの作成
PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ hashtags: 1 });
PostSchema.index({ hashtags: 1, createdAt: -1 });
PostSchema.index({ visibility: 1, createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

export default Post;
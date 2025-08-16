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
  }
}, {
  timestamps: true
});

// インデックスの作成
PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

export default Post;
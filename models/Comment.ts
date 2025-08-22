import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Post',
    index: true
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
  }
}, {
  timestamps: true
});

// 複合インデックス（投稿ごとのコメント取得を高速化）
CommentSchema.index({ postId: 1, createdAt: -1 });

const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);

export default Comment;
import mongoose, { Schema, Document, models } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string | null;
  likes: string[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema({
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

const Post = models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;
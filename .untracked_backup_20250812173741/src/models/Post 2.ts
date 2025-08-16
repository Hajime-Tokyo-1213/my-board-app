import mongoose, { Schema, Document, models } from 'mongoose';

export interface IPost extends Document {
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema({
  content: { 
    type: String, 
    required: true,
    maxlength: 200 
  }
}, { 
  timestamps: true 
});

const Post = models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;
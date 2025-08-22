import mongoose, { Schema, Document } from 'mongoose';

export interface IHashtag extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  count: number;
  posts: mongoose.Types.ObjectId[];
  lastUsed: Date;
  searchCount: number;
  lastSearched: Date;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HashtagSchema = new Schema<IHashtag>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    count: {
      type: Number,
      default: 0,
      index: true,
    },
    posts: [{
      type: Schema.Types.ObjectId,
      ref: 'Post',
    }],
    lastUsed: {
      type: Date,
      default: Date.now,
    },
    searchCount: {
      type: Number,
      default: 0,
    },
    lastSearched: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

HashtagSchema.index({ count: -1, lastUsed: -1 });
HashtagSchema.index({ name: 'text' });

const Hashtag = mongoose.models.Hashtag || mongoose.model<IHashtag>('Hashtag', HashtagSchema);

export default Hashtag;
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IImage extends Document {
  publicId: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  format: string;
  width: number;
  height: number;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ImageSchema = new Schema<IImage>(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    mediumUrl: {
      type: String,
      required: true,
    },
    largeUrl: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// インデックス
ImageSchema.index({ uploadedBy: 1, createdAt: -1 });
ImageSchema.index({ postId: 1 });
ImageSchema.index({ publicId: 1 });

const Image: Model<IImage> = 
  mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);

export default Image;
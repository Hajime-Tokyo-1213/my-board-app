import mongoose, { Document, Model, Schema } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'follow' | 'like' | 'comment';
  fromUserId: mongoose.Types.ObjectId;
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['follow', 'like', 'comment'],
      required: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: false,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

const Notification: Model<INotification> = 
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
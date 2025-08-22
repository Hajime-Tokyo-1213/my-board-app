import Notification from '@/models/Notification';
import mongoose from 'mongoose';

interface CreateNotificationParams {
  userId: string | mongoose.Types.ObjectId;
  type: 'follow' | 'like' | 'comment';
  fromUserId: string | mongoose.Types.ObjectId;
  postId?: string | mongoose.Types.ObjectId;
  commentId?: string | mongoose.Types.ObjectId;
  message: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    if (params.userId.toString() === params.fromUserId.toString()) {
      return null;
    }

    const notification = await Notification.create({
      userId: params.userId,
      type: params.type,
      fromUserId: params.fromUserId,
      postId: params.postId,
      commentId: params.commentId,
      message: params.message,
      read: false,
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function createFollowNotification(
  userId: string | mongoose.Types.ObjectId,
  fromUserId: string | mongoose.Types.ObjectId,
  fromUsername: string
) {
  return createNotification({
    userId,
    type: 'follow',
    fromUserId,
    message: `があなたをフォローしました`,
  });
}

export async function createLikeNotification(
  userId: string | mongoose.Types.ObjectId,
  fromUserId: string | mongoose.Types.ObjectId,
  fromUsername: string,
  postId: string | mongoose.Types.ObjectId,
  postTitle: string
) {
  return createNotification({
    userId,
    type: 'like',
    fromUserId,
    postId,
    message: `があなたの投稿「${postTitle.substring(0, 20)}${postTitle.length > 20 ? '...' : ''}」にいいねしました`,
  });
}

export async function createCommentNotification(
  userId: string | mongoose.Types.ObjectId,
  fromUserId: string | mongoose.Types.ObjectId,
  fromUsername: string,
  postId: string | mongoose.Types.ObjectId,
  commentId: string | mongoose.Types.ObjectId,
  postTitle: string
) {
  return createNotification({
    userId,
    type: 'comment',
    fromUserId,
    postId,
    commentId,
    message: `があなたの投稿「${postTitle.substring(0, 20)}${postTitle.length > 20 ? '...' : ''}」にコメントしました`,
  });
}
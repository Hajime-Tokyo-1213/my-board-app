export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  content: string;
  images?: string[];
  author: User;
  authorId: string;
  likes: Like[];
  likesCount: number;
  comments: Comment[];
  commentsCount: number;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  content: string;
  postId: string;
  author: User;
  authorId: string;
  likes: Like[];
  likesCount: number;
  isLiked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Like {
  id: string;
  userId: string;
  user: User;
  postId?: string;
  commentId?: string;
  createdAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  follower: User;
  followingId: string;
  following: User;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: User;
  recipientId: string;
  recipient: User;
  conversationId: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention';
  userId: string;
  user: User;
  actorId: string;
  actor: User;
  postId?: string;
  post?: Post;
  commentId?: string;
  comment?: Comment;
  messageId?: string;
  message?: Message;
  isRead: boolean;
  createdAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    nextCursor?: string;
  };
}
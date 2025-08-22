// Socket.io イベントタイプ定義

export enum SocketEvents {
  // 接続管理
  CONNECT = 'connect',
  CONNECTED = 'connected',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  ERROR = 'error',
  
  // 投稿関連
  POST_CREATED = 'post:created',
  POST_UPDATED = 'post:updated',
  POST_DELETED = 'post:deleted',
  POST_LIKED = 'post:liked',
  POST_UNLIKED = 'post:unliked',
  
  // コメント関連
  COMMENT_ADDED = 'comment:added',
  COMMENT_UPDATED = 'comment:updated',
  COMMENT_DELETED = 'comment:deleted',
  
  // 通知関連
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_READ = 'notification:read',
  NOTIFICATION_CLEAR = 'notification:clear',
  
  // ユーザー関連
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_TYPING = 'user:typing',
  USER_STOPPED_TYPING = 'user:stopped_typing',
  USER_FOLLOWED = 'user:followed',
  USER_UNFOLLOWED = 'user:unfollowed',
  
  // システム
  HEARTBEAT = 'heartbeat',
  SYNC_REQUEST = 'sync:request',
  SYNC_RESPONSE = 'sync:response',
}

// 各イベントのペイロード型定義
export interface SocketEventPayload {
  [SocketEvents.CONNECT]: void;
  
  [SocketEvents.CONNECTED]: {
    userId: string;
    socketId: string;
    timestamp: Date;
  };
  
  [SocketEvents.DISCONNECT]: {
    reason: string;
  };
  
  [SocketEvents.RECONNECT]: {
    attempt: number;
  };
  
  [SocketEvents.ERROR]: {
    message: string;
    code?: string;
    timestamp: Date;
  };
  
  [SocketEvents.POST_CREATED]: {
    post: {
      id: string;
      title: string;
      content: string;
      author: string;
      createdAt: Date;
    };
    author?: {
      id: string;
      name: string;
      avatar?: string;
    };
    timestamp: Date;
  };
  
  [SocketEvents.POST_UPDATED]: {
    postId: string;
    updates: {
      title?: string;
      content?: string;
    };
    timestamp: Date;
  };
  
  [SocketEvents.POST_DELETED]: {
    postId: string;
    timestamp: Date;
  };
  
  [SocketEvents.POST_LIKED]: {
    postId: string;
    userId: string;
    likeCount: number;
    timestamp: Date;
  };
  
  [SocketEvents.POST_UNLIKED]: {
    postId: string;
    userId: string;
    likeCount: number;
    timestamp: Date;
  };
  
  [SocketEvents.COMMENT_ADDED]: {
    comment: {
      id: string;
      postId: string;
      content: string;
      author: string;
      createdAt: Date;
    };
    timestamp: Date;
  };
  
  [SocketEvents.COMMENT_UPDATED]: {
    commentId: string;
    postId: string;
    content: string;
    timestamp: Date;
  };
  
  [SocketEvents.COMMENT_DELETED]: {
    commentId: string;
    postId: string;
    timestamp: Date;
  };
  
  [SocketEvents.NOTIFICATION_NEW]: {
    notification: {
      id: string;
      type: string;
      title: string;
      message: string;
      read: boolean;
      createdAt: Date;
    };
    userId: string;
    priority: 'high' | 'normal' | 'low';
  };
  
  [SocketEvents.NOTIFICATION_READ]: {
    notificationId: string;
    userId: string;
    timestamp: Date;
  };
  
  [SocketEvents.NOTIFICATION_CLEAR]: {
    userId: string;
    timestamp: Date;
  };
  
  [SocketEvents.USER_ONLINE]: {
    userId: string;
    timestamp: Date;
  };
  
  [SocketEvents.USER_OFFLINE]: {
    userId: string;
    timestamp: Date;
  };
  
  [SocketEvents.USER_TYPING]: {
    userId: string;
    userName?: string;
    postId: string;
    timestamp?: Date;
  };
  
  [SocketEvents.USER_STOPPED_TYPING]: {
    userId: string;
    postId: string;
    timestamp?: Date;
  };
  
  [SocketEvents.USER_FOLLOWED]: {
    followerId: string;
    followedId: string;
    timestamp: Date;
  };
  
  [SocketEvents.USER_UNFOLLOWED]: {
    followerId: string;
    followedId: string;
    timestamp: Date;
  };
  
  [SocketEvents.HEARTBEAT]: {
    timestamp: Date;
  };
  
  [SocketEvents.SYNC_REQUEST]: void;
  
  [SocketEvents.SYNC_RESPONSE]: {
    onlineUsers: string[];
    timestamp: Date;
  };
}

// WebSocket接続状態
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// WebSocket設定
export interface SocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  transports?: ('websocket' | 'polling')[];
  auth?: {
    token?: string;
  };
}
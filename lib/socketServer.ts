import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { SocketEvents, SocketEventPayload } from '@/types/socket';

export interface SocketUser {
  id: string;
  email: string;
  name: string;
}

export interface SocketConnection {
  userId: string;
  socketId: string;
  connectedAt: Date;
  rooms: Set<string>;
}

class SocketServer {
  private io: Server;
  private connections: Map<string, SocketConnection>;
  private userSockets: Map<string, Set<string>>; // userId -> socketIds
  private redisClient: ReturnType<typeof createClient> | null = null;
  private redisSub: ReturnType<typeof createClient> | null = null;

  constructor(httpServer: HTTPServer) {
    this.connections = new Map();
    this.userSockets = new Map();

    // Socket.ioサーバーの初期化
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
    });

    // Redis Adapterの設定（本番環境用）
    if (process.env.REDIS_URL) {
      this.setupRedisAdapter();
    }

    // ミドルウェアとイベントハンドラーの設定
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  // Redis Adapterのセットアップ
  private async setupRedisAdapter() {
    try {
      this.redisClient = createClient({ url: process.env.REDIS_URL });
      this.redisSub = this.redisClient.duplicate();

      await Promise.all([
        this.redisClient.connect(),
        this.redisSub.connect(),
      ]);

      this.io.adapter(createAdapter(this.redisClient, this.redisSub));
      console.log('Redis adapter connected');
    } catch (error) {
      console.error('Redis adapter connection failed:', error);
      // Redisが失敗してもインメモリで動作を継続
    }
  }

  // 認証ミドルウェア
  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // JWTトークンの検証
        const decoded = jwt.verify(
          token,
          process.env.NEXTAUTH_SECRET!
        ) as SocketUser;

        // ユーザー情報をソケットに付与
        (socket as any).user = decoded;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  // イベントハンドラーの設定
  private setupEventHandlers() {
    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user as SocketUser;
      console.log(`User ${user.name} connected (${socket.id})`);

      // 接続を記録
      this.handleConnection(socket, user);

      // 基本イベントハンドラー
      socket.on('disconnect', () => this.handleDisconnect(socket, user));
      socket.on('error', (error) => this.handleError(socket, error));

      // カスタムイベントハンドラー
      this.setupPostEventHandlers(socket, user);
      this.setupNotificationHandlers(socket, user);
      this.setupTypingHandlers(socket, user);
      this.setupSyncHandlers(socket, user);
    });
  }

  // 接続処理
  private handleConnection(socket: Socket, user: SocketUser) {
    const connection: SocketConnection = {
      userId: user.id,
      socketId: socket.id,
      connectedAt: new Date(),
      rooms: new Set(),
    };

    // 接続を記録
    this.connections.set(socket.id, connection);

    // ユーザーソケットマッピング
    if (!this.userSockets.has(user.id)) {
      this.userSockets.set(user.id, new Set());
    }
    this.userSockets.get(user.id)!.add(socket.id);

    // デフォルトルームに参加
    this.joinUserRooms(socket, user);

    // オンライン状態を通知
    this.broadcastUserStatus(user.id, 'online');

    // 接続成功を通知
    socket.emit('connected', {
      userId: user.id,
      socketId: socket.id,
      timestamp: new Date(),
    });
  }

  // 切断処理
  private handleDisconnect(socket: Socket, user: SocketUser) {
    console.log(`User ${user.name} disconnected (${socket.id})`);

    // 接続を削除
    this.connections.delete(socket.id);

    // ユーザーソケットマッピングを更新
    const userSocketSet = this.userSockets.get(user.id);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      
      // ユーザーの全ソケットが切断された場合
      if (userSocketSet.size === 0) {
        this.userSockets.delete(user.id);
        // オフライン状態を通知
        this.broadcastUserStatus(user.id, 'offline');
      }
    }
  }

  // エラー処理
  private handleError(socket: Socket, error: Error) {
    console.error(`Socket error for ${socket.id}:`, error);
    socket.emit('error', {
      message: error.message,
      timestamp: new Date(),
    });
  }

  // ユーザーをルームに参加させる
  private async joinUserRooms(socket: Socket, user: SocketUser) {
    const connection = this.connections.get(socket.id);
    if (!connection) return;

    // 個人ルーム
    const userRoom = `user:${user.id}`;
    await socket.join(userRoom);
    connection.rooms.add(userRoom);

    // パブリックルーム
    await socket.join('public');
    connection.rooms.add('public');

    // フォロー中のユーザーのルーム（データベースから取得）
    // TODO: データベースからフォロー情報を取得
    // const following = await getFollowing(user.id);
    // for (const followedUserId of following) {
    //   const room = `following:${followedUserId}`;
    //   await socket.join(room);
    //   connection.rooms.add(room);
    // }
  }

  // 投稿関連イベントハンドラー
  private setupPostEventHandlers(socket: Socket, user: SocketUser) {
    // 投稿作成の通知
    socket.on(SocketEvents.POST_CREATED, (data: SocketEventPayload[SocketEvents.POST_CREATED]) => {
      // バリデーション
      if (!data.post || !data.post.id) {
        socket.emit('error', { message: 'Invalid post data' });
        return;
      }

      // フォロワーに通知
      const room = `following:${user.id}`;
      socket.to(room).emit(SocketEvents.POST_CREATED, {
        ...data,
        author: user,
        timestamp: new Date(),
      });

      // パブリックルームにも通知
      socket.to('public').emit(SocketEvents.POST_CREATED, {
        ...data,
        author: user,
        timestamp: new Date(),
      });
    });

    // いいね更新の通知
    socket.on(SocketEvents.POST_LIKED, (data: SocketEventPayload[SocketEvents.POST_LIKED]) => {
      // 投稿に関連するユーザーに通知
      this.io.emit(SocketEvents.POST_LIKED, {
        ...data,
        userId: user.id,
        timestamp: new Date(),
      });
    });

    // いいね解除の通知
    socket.on(SocketEvents.POST_UNLIKED, (data: SocketEventPayload[SocketEvents.POST_UNLIKED]) => {
      this.io.emit(SocketEvents.POST_UNLIKED, {
        ...data,
        userId: user.id,
        timestamp: new Date(),
      });
    });
  }

  // 通知関連ハンドラー
  private setupNotificationHandlers(socket: Socket, user: SocketUser) {
    socket.on(SocketEvents.NOTIFICATION_NEW, (data: SocketEventPayload[SocketEvents.NOTIFICATION_NEW]) => {
      // 特定のユーザーに通知を送信
      const targetSocketIds = this.userSockets.get(data.userId);
      if (targetSocketIds) {
        targetSocketIds.forEach(socketId => {
          this.io.to(socketId).emit(SocketEvents.NOTIFICATION_NEW, data);
        });
      }
    });

    socket.on(SocketEvents.NOTIFICATION_READ, (data: SocketEventPayload[SocketEvents.NOTIFICATION_READ]) => {
      // 通知の既読状態を同期
      const userSocketIds = this.userSockets.get(user.id);
      if (userSocketIds) {
        userSocketIds.forEach(socketId => {
          if (socketId !== socket.id) {
            this.io.to(socketId).emit(SocketEvents.NOTIFICATION_READ, data);
          }
        });
      }
    });
  }

  // タイピング状態ハンドラー
  private setupTypingHandlers(socket: Socket, user: SocketUser) {
    let typingTimeout: NodeJS.Timeout | null = null;

    socket.on(SocketEvents.USER_TYPING, (data: SocketEventPayload[SocketEvents.USER_TYPING]) => {
      // タイピング状態をブロードキャスト
      socket.broadcast.emit(SocketEvents.USER_TYPING, {
        ...data,
        userId: user.id,
        userName: user.name,
      });

      // 自動的にタイピング停止を送信
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      typingTimeout = setTimeout(() => {
        socket.broadcast.emit(SocketEvents.USER_STOPPED_TYPING, {
          userId: user.id,
          postId: data.postId,
        });
      }, 3000);
    });

    socket.on(SocketEvents.USER_STOPPED_TYPING, (data: SocketEventPayload[SocketEvents.USER_STOPPED_TYPING]) => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
      socket.broadcast.emit(SocketEvents.USER_STOPPED_TYPING, {
        ...data,
        userId: user.id,
      });
    });
  }

  // 同期ハンドラー
  private setupSyncHandlers(socket: Socket, user: SocketUser) {
    socket.on(SocketEvents.SYNC_REQUEST, async () => {
      // 最新の状態を送信
      // TODO: データベースから最新情報を取得
      socket.emit(SocketEvents.SYNC_RESPONSE, {
        onlineUsers: Array.from(this.userSockets.keys()),
        timestamp: new Date(),
      });
    });

    // ハートビート
    socket.on(SocketEvents.HEARTBEAT, () => {
      socket.emit(SocketEvents.HEARTBEAT, { timestamp: new Date() });
    });
  }

  // ユーザー状態のブロードキャスト
  private broadcastUserStatus(userId: string, status: 'online' | 'offline') {
    const event = status === 'online' ? SocketEvents.USER_ONLINE : SocketEvents.USER_OFFLINE;
    this.io.emit(event, { userId, timestamp: new Date() });
  }

  // 外部からイベントを発行するためのメソッド
  public emit(event: string, data: any, rooms?: string[]) {
    if (rooms && rooms.length > 0) {
      rooms.forEach(room => {
        this.io.to(room).emit(event, data);
      });
    } else {
      this.io.emit(event, data);
    }
  }

  // 特定のユーザーにイベントを送信
  public emitToUser(userId: string, event: string, data: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach(socketId => {
        this.io.to(socketId).emit(event, data);
      });
    }
  }

  // ルームにユーザーを追加
  public async joinRoom(userId: string, room: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          await socket.join(room);
          const connection = this.connections.get(socketId);
          if (connection) {
            connection.rooms.add(room);
          }
        }
      }
    }
  }

  // ルームからユーザーを削除
  public async leaveRoom(userId: string, room: string) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      for (const socketId of socketIds) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          await socket.leave(room);
          const connection = this.connections.get(socketId);
          if (connection) {
            connection.rooms.delete(room);
          }
        }
      }
    }
  }

  // サーバーのシャットダウン
  public async shutdown() {
    console.log('Shutting down WebSocket server...');
    
    // 全接続を閉じる
    this.io.disconnectSockets();
    
    // Redisクライアントを閉じる
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    if (this.redisSub) {
      await this.redisSub.quit();
    }
    
    // Socket.ioサーバーを閉じる
    await new Promise<void>((resolve) => {
      this.io.close(() => {
        console.log('WebSocket server shut down');
        resolve();
      });
    });
  }

  // 統計情報を取得
  public getStats() {
    return {
      totalConnections: this.connections.size,
      uniqueUsers: this.userSockets.size,
      rooms: this.io.sockets.adapter.rooms.size,
    };
  }
}

// シングルトンインスタンス
let socketServer: SocketServer | null = null;

export function initSocketServer(httpServer: HTTPServer): SocketServer {
  if (!socketServer) {
    socketServer = new SocketServer(httpServer);
  }
  return socketServer;
}

export function getSocketServer(): SocketServer | null {
  return socketServer;
}

export default SocketServer;
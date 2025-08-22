import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSocketServer } from '@/lib/socketServer';
import { SocketEvents } from '@/types/socket';

// WebSocketが利用できない場合のフォールバック用エンドポイント
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await request.json();

    if (!event || !data) {
      return NextResponse.json(
        { error: 'Event and data are required' },
        { status: 400 }
      );
    }

    // Socket.ioサーバーが利用可能な場合
    const socketServer = getSocketServer();
    if (socketServer) {
      // イベントタイプに応じて適切なルームに送信
      switch (event) {
        case SocketEvents.POST_CREATED:
        case SocketEvents.POST_UPDATED:
        case SocketEvents.POST_DELETED:
          // パブリックルームと作者のフォロワーに送信
          socketServer.emit(event, {
            ...data,
            userId: session.user.id,
            timestamp: new Date(),
          }, ['public', `following:${session.user.id}`]);
          break;

        case SocketEvents.POST_LIKED:
        case SocketEvents.POST_UNLIKED:
          // 全ユーザーに送信（投稿の表示を更新するため）
          socketServer.emit(event, {
            ...data,
            userId: session.user.id,
            timestamp: new Date(),
          });
          break;

        case SocketEvents.COMMENT_ADDED:
        case SocketEvents.COMMENT_UPDATED:
        case SocketEvents.COMMENT_DELETED:
          // 投稿に関連するユーザーに送信
          socketServer.emit(event, {
            ...data,
            userId: session.user.id,
            timestamp: new Date(),
          });
          break;

        case SocketEvents.NOTIFICATION_NEW:
          // 特定のユーザーに送信
          if (data.userId) {
            socketServer.emitToUser(data.userId, event, {
              ...data,
              timestamp: new Date(),
            });
          }
          break;

        case SocketEvents.USER_TYPING:
        case SocketEvents.USER_STOPPED_TYPING:
          // タイピング状態をブロードキャスト
          socketServer.emit(event, {
            ...data,
            userId: session.user.id,
            userName: session.user.name || session.user.email,
            timestamp: new Date(),
          });
          break;

        default:
          // その他のイベントは全体に送信
          socketServer.emit(event, {
            ...data,
            userId: session.user.id,
            timestamp: new Date(),
          });
      }

      return NextResponse.json({
        success: true,
        message: 'Event emitted successfully',
      });
    }

    // Socket.ioサーバーが利用できない場合はキューに保存
    // TODO: Redis や データベースにイベントを保存して、後で配信
    await saveEventToQueue(event, data, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Event queued for delivery',
      queued: true,
    });
  } catch (error) {
    console.error('Emit error:', error);
    return NextResponse.json(
      { error: 'Failed to emit event' },
      { status: 500 }
    );
  }
}

// イベントをキューに保存（フォールバック用）
async function saveEventToQueue(event: string, data: any, userId: string) {
  // 実装例: Redisまたはデータベースに保存
  // この例では、簡単のためにメモリに保存（本番環境では永続化が必要）
  const eventQueue = globalThis.eventQueue || [];
  
  eventQueue.push({
    event,
    data,
    userId,
    timestamp: new Date(),
    retries: 0,
  });

  // グローバル変数に保存（開発用）
  globalThis.eventQueue = eventQueue;

  // 定期的に配信を試みる
  if (!globalThis.eventQueueProcessor) {
    globalThis.eventQueueProcessor = setInterval(() => {
      processEventQueue();
    }, 5000);
  }
}

// キューからイベントを処理
async function processEventQueue() {
  const socketServer = getSocketServer();
  if (!socketServer || !globalThis.eventQueue || globalThis.eventQueue.length === 0) {
    return;
  }

  const queue = [...globalThis.eventQueue];
  globalThis.eventQueue = [];

  for (const item of queue) {
    try {
      socketServer.emit(item.event, {
        ...item.data,
        userId: item.userId,
        timestamp: item.timestamp,
      });
    } catch (error) {
      console.error('Failed to process queued event:', error);
      
      // リトライ
      if (item.retries < 3) {
        item.retries++;
        globalThis.eventQueue.push(item);
      }
    }
  }
}
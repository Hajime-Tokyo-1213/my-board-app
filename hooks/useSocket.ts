'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { SocketEvents, SocketEventPayload, ConnectionState, SocketConfig } from '@/types/socket';

interface UseSocketOptions extends SocketConfig {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onReconnect?: (attempt: number) => void;
  onError?: (error: Error) => void;
  debug?: boolean;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;
  emit: <T extends keyof SocketEventPayload>(
    event: T,
    data: SocketEventPayload[T]
  ) => boolean;
  on: <T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => () => void;
  off: <T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => void;
  once: <T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => void;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { data: session } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const eventHandlersRef = useRef<Map<string, Set<Function>>>(new Map());
  const fallbackModeRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout>();

  const {
    url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    reconnectionDelayMax = 5000,
    timeout = 20000,
    transports = ['websocket', 'polling'],
    onConnect,
    onDisconnect,
    onReconnect,
    onError,
    debug = false,
  } = options;

  // デバッグログ
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[useSocket]', ...args);
    }
  }, [debug]);

  // Socket.io接続の初期化
  const initSocket = useCallback(() => {
    if (socketRef.current?.connected) {
      log('Socket already connected');
      return socketRef.current;
    }

    log('Initializing socket connection...');
    setConnectionState(ConnectionState.CONNECTING);

    const socket = io(url, {
      transports,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      reconnectionDelayMax,
      timeout,
      auth: {
        token: session?.user?.id ? generateAuthToken(session.user.id) : undefined,
      },
    });

    // 接続イベント
    socket.on('connect', () => {
      log('Socket connected:', socket.id);
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
      fallbackModeRef.current = false;
      stopPolling();
      onConnect?.();
    });

    // 切断イベント
    socket.on('disconnect', (reason: string) => {
      log('Socket disconnected:', reason);
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
      onDisconnect?.(reason);

      // 自動再接続が無効な場合、フォールバックモードを有効化
      if (!reconnection && reason === 'io server disconnect') {
        enableFallbackMode();
      }
    });

    // 再接続中イベント
    socket.on('reconnect_attempt', (attempt: number) => {
      log('Reconnection attempt:', attempt);
      setConnectionState(ConnectionState.RECONNECTING);
    });

    // 再接続成功イベント
    socket.on('reconnect', (attempt: number) => {
      log('Reconnected after', attempt, 'attempts');
      setIsConnected(true);
      setConnectionState(ConnectionState.CONNECTED);
      fallbackModeRef.current = false;
      stopPolling();
      onReconnect?.(attempt);
    });

    // 再接続失敗イベント
    socket.on('reconnect_failed', () => {
      log('Reconnection failed, enabling fallback mode');
      setConnectionState(ConnectionState.ERROR);
      enableFallbackMode();
    });

    // エラーイベント
    socket.on('error', (error: any) => {
      log('Socket error:', error);
      setConnectionState(ConnectionState.ERROR);
      onError?.(new Error(error.message || 'Socket error'));
    });

    // 接続エラーイベント
    socket.on('connect_error', (error: Error) => {
      log('Connection error:', error.message);
      if (socket.io.opts.reconnectionAttempts && 
          socket.io._reconnectionAttempts >= socket.io.opts.reconnectionAttempts) {
        enableFallbackMode();
      }
    });

    socketRef.current = socket;
    return socket;
  }, [url, transports, reconnection, reconnectionAttempts, reconnectionDelay, 
      reconnectionDelayMax, timeout, session, onConnect, onDisconnect, 
      onReconnect, onError, log]);

  // 接続
  const connect = useCallback(() => {
    if (!socketRef.current) {
      initSocket();
    } else if (!socketRef.current.connected) {
      log('Connecting socket...');
      socketRef.current.connect();
    }
  }, [initSocket, log]);

  // 切断
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      log('Disconnecting socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setConnectionState(ConnectionState.DISCONNECTED);
      stopPolling();
    }
  }, [log]);

  // イベント送信
  const emit = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    data: SocketEventPayload[T]
  ): boolean => {
    if (!socketRef.current?.connected) {
      log('Cannot emit, socket not connected:', event);
      
      // フォールバックモードの場合はHTTP経由で送信
      if (fallbackModeRef.current) {
        sendViaHttp(event as string, data);
      }
      return false;
    }

    log('Emitting event:', event, data);
    socketRef.current.emit(event as string, data);
    return true;
  }, [log]);

  // イベントリスナー登録
  const on = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ): (() => void) => {
    const eventName = event as string;

    // ハンドラーを記録
    if (!eventHandlersRef.current.has(eventName)) {
      eventHandlersRef.current.set(eventName, new Set());
    }
    eventHandlersRef.current.get(eventName)!.add(handler);

    // Socket.ioにハンドラーを登録
    if (socketRef.current) {
      socketRef.current.on(eventName, handler as any);
    }

    // フォールバックモード用のイベントリスナー
    const fallbackHandler = (e: CustomEvent) => {
      if (fallbackModeRef.current) {
        handler(e.detail);
      }
    };
    window.addEventListener(`socket:${eventName}`, fallbackHandler as any);

    // クリーンアップ関数を返す
    return () => {
      off(event, handler);
      window.removeEventListener(`socket:${eventName}`, fallbackHandler as any);
    };
  }, []);

  // イベントリスナー解除
  const off = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => {
    const eventName = event as string;
    const handlers = eventHandlersRef.current.get(eventName);
    
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventName);
      }
    }

    if (socketRef.current) {
      socketRef.current.off(eventName, handler as any);
    }
  }, []);

  // 一度だけ実行されるイベントリスナー
  const once = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => {
    if (socketRef.current) {
      socketRef.current.once(event as string, handler as any);
    }
  }, []);

  // フォールバックモードの有効化
  const enableFallbackMode = useCallback(() => {
    log('Enabling fallback mode (HTTP polling)');
    fallbackModeRef.current = true;
    startPolling();
  }, [log]);

  // ポーリング開始
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    log('Starting HTTP polling...');
    
    const poll = async () => {
      try {
        const response = await fetch('/api/realtime/poll', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.user?.id ? generateAuthToken(session.user.id) : ''}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          processPolledData(data);
        }
      } catch (error) {
        log('Polling error:', error);
      }
    };

    // 即座に一度実行
    poll();
    
    // 定期的にポーリング
    pollingIntervalRef.current = setInterval(poll, 5000);
  }, [session, log]);

  // ポーリング停止
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      log('Stopping HTTP polling');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = undefined;
    }
  }, [log]);

  // ポーリングデータの処理
  const processPolledData = useCallback((data: any) => {
    if (data.events && Array.isArray(data.events)) {
      data.events.forEach((event: any) => {
        // カスタムイベントとして発行
        const customEvent = new CustomEvent(`socket:${event.type}`, {
          detail: event.payload,
        });
        window.dispatchEvent(customEvent);

        // 登録されたハンドラーを直接呼び出し
        const handlers = eventHandlersRef.current.get(event.type);
        if (handlers) {
          handlers.forEach(handler => handler(event.payload));
        }
      });
    }
  }, []);

  // HTTP経由でイベントを送信（フォールバック）
  const sendViaHttp = useCallback(async (event: string, data: any) => {
    try {
      log('Sending event via HTTP:', event);
      const response = await fetch('/api/realtime/emit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.id ? generateAuthToken(session.user.id) : ''}`,
        },
        body: JSON.stringify({ event, data }),
      });

      if (!response.ok) {
        throw new Error('Failed to send event via HTTP');
      }
    } catch (error) {
      log('HTTP emit error:', error);
    }
  }, [session, log]);

  // 初期化とクリーンアップ
  useEffect(() => {
    if (autoConnect && session?.user?.id) {
      connect();
    }

    return () => {
      disconnect();
      stopPolling();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [session?.user?.id, autoConnect]);

  // 再接続時にイベントハンドラーを再登録
  useEffect(() => {
    if (isConnected && socketRef.current) {
      eventHandlersRef.current.forEach((handlers, event) => {
        handlers.forEach(handler => {
          socketRef.current!.on(event, handler as any);
        });
      });
    }
  }, [isConnected]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    connect,
    disconnect,
    emit,
    on,
    off,
    once,
  };
}

// 簡易的なJWTトークン生成（実際の実装では適切な認証を使用）
function generateAuthToken(userId: string): string {
  // TODO: 実際のJWT生成を実装
  return Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');
}

export default useSocket;
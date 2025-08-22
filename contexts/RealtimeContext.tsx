'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/hooks/useSocket';
import { SocketEvents, SocketEventPayload, ConnectionState } from '@/types/socket';

interface RealtimeContextValue {
  // 接続状態
  isConnected: boolean;
  connectionState: ConnectionState;
  
  // ユーザー状態
  onlineUsers: Set<string>;
  typingUsers: Map<string, { postId: string; userName: string }>;
  
  // イベント操作
  subscribe: <T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => () => void;
  unsubscribe: <T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ) => void;
  emit: <T extends keyof SocketEventPayload>(
    event: T,
    data: SocketEventPayload[T]
  ) => boolean;
  
  // 接続操作
  connect: () => void;
  disconnect: () => void;
  
  // 統計情報
  stats: {
    messagesReceived: number;
    messagesSent: number;
    connectionTime: number;
    lastActivity: Date | null;
  };
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

interface RealtimeProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  debug?: boolean;
}

export function RealtimeProvider({ 
  children, 
  autoConnect = true,
  debug = false 
}: RealtimeProviderProps) {
  const { data: session } = useSession();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, { postId: string; userName: string }>>(new Map());
  const [stats, setStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    connectionTime: 0,
    lastActivity: null as Date | null,
  });
  
  const connectionStartRef = useRef<Date | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const {
    isConnected,
    connectionState,
    connect,
    disconnect,
    emit: socketEmit,
    on,
    off,
  } = useSocket({
    autoConnect: autoConnect && !!session,
    debug,
    onConnect: () => {
      console.log('🟢 WebSocket connected');
      connectionStartRef.current = new Date();
      
      // 初期同期をリクエスト
      socketEmit(SocketEvents.SYNC_REQUEST, undefined as any);
    },
    onDisconnect: (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
      
      // 接続時間を更新
      if (connectionStartRef.current) {
        const connectionTime = Date.now() - connectionStartRef.current.getTime();
        setStats(prev => ({
          ...prev,
          connectionTime: prev.connectionTime + connectionTime,
        }));
        connectionStartRef.current = null;
      }
      
      // オンラインユーザーをクリア
      setOnlineUsers(new Set());
      setTypingUsers(new Map());
    },
    onReconnect: (attempt) => {
      console.log('🔄 WebSocket reconnected after', attempt, 'attempts');
      connectionStartRef.current = new Date();
      
      // 再同期をリクエスト
      socketEmit(SocketEvents.SYNC_REQUEST, undefined as any);
    },
    onError: (error) => {
      console.error('❌ WebSocket error:', error);
    },
  });
  
  // イベントの送信（統計情報付き）
  const emit = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    data: SocketEventPayload[T]
  ): boolean => {
    const result = socketEmit(event, data);
    
    if (result) {
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1,
        lastActivity: new Date(),
      }));
    }
    
    return result;
  }, [socketEmit]);
  
  // イベントの購読（統計情報付き）
  const subscribe = useCallback(<T extends keyof SocketEventPayload>(
    event: T,
    handler: (data: SocketEventPayload[T]) => void
  ): (() => void) => {
    const wrappedHandler = (data: SocketEventPayload[T]) => {
      setStats(prev => ({
        ...prev,
        messagesReceived: prev.messagesReceived + 1,
        lastActivity: new Date(),
      }));
      handler(data);
    };
    
    return on(event, wrappedHandler);
  }, [on]);
  
  // オンライン/オフラインユーザー管理
  useEffect(() => {
    const handleUserOnline = (data: SocketEventPayload[SocketEvents.USER_ONLINE]) => {
      setOnlineUsers(prev => new Set(prev).add(data.userId));
    };
    
    const handleUserOffline = (data: SocketEventPayload[SocketEvents.USER_OFFLINE]) => {
      setOnlineUsers(prev => {
        const next = new Set(prev);
        next.delete(data.userId);
        return next;
      });
      
      // タイピング状態もクリア
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };
    
    const handleSyncResponse = (data: SocketEventPayload[SocketEvents.SYNC_RESPONSE]) => {
      setOnlineUsers(new Set(data.onlineUsers));
    };
    
    const unsubscribeOnline = on(SocketEvents.USER_ONLINE, handleUserOnline);
    const unsubscribeOffline = on(SocketEvents.USER_OFFLINE, handleUserOffline);
    const unsubscribeSync = on(SocketEvents.SYNC_RESPONSE, handleSyncResponse);
    
    return () => {
      unsubscribeOnline();
      unsubscribeOffline();
      unsubscribeSync();
    };
  }, [on]);
  
  // タイピング状態管理
  useEffect(() => {
    const handleTyping = (data: SocketEventPayload[SocketEvents.USER_TYPING]) => {
      const { userId, userName = 'Unknown', postId } = data;
      
      setTypingUsers(prev => new Map(prev).set(userId, { postId, userName }));
      
      // 既存のタイムアウトをクリア
      const existingTimeout = typingTimeoutsRef.current.get(userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // 3秒後に自動的にタイピング状態を解除
      const timeout = setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
        typingTimeoutsRef.current.delete(userId);
      }, 3000);
      
      typingTimeoutsRef.current.set(userId, timeout);
    };
    
    const handleStoppedTyping = (data: SocketEventPayload[SocketEvents.USER_STOPPED_TYPING]) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      
      // タイムアウトをクリア
      const timeout = typingTimeoutsRef.current.get(data.userId);
      if (timeout) {
        clearTimeout(timeout);
        typingTimeoutsRef.current.delete(data.userId);
      }
    };
    
    const unsubscribeTyping = on(SocketEvents.USER_TYPING, handleTyping);
    const unsubscribeStoppedTyping = on(SocketEvents.USER_STOPPED_TYPING, handleStoppedTyping);
    
    return () => {
      unsubscribeTyping();
      unsubscribeStoppedTyping();
      
      // 全タイムアウトをクリア
      typingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [on]);
  
  // ハートビート送信
  useEffect(() => {
    if (!isConnected) return;
    
    const heartbeatInterval = setInterval(() => {
      emit(SocketEvents.HEARTBEAT, { timestamp: new Date() });
    }, 30000); // 30秒ごと
    
    return () => clearInterval(heartbeatInterval);
  }, [isConnected, emit]);
  
  const value: RealtimeContextValue = {
    isConnected,
    connectionState,
    onlineUsers,
    typingUsers,
    subscribe,
    unsubscribe: off,
    emit,
    connect,
    disconnect,
    stats,
  };
  
  return (
    <RealtimeContext.Provider value={value}>
      {children}
      {debug && <RealtimeDebugPanel />}
    </RealtimeContext.Provider>
  );
}

// リアルタイムコンテキストを使用するフック
export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

// デバッグパネル（開発環境のみ）
function RealtimeDebugPanel() {
  const {
    isConnected,
    connectionState,
    onlineUsers,
    typingUsers,
    stats,
  } = useRealtime();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed bottom-4 right-4 p-3 bg-black/90 text-white text-xs rounded-lg shadow-lg max-w-xs z-50">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500 animate-pulse'
                : connectionState === ConnectionState.RECONNECTING
                ? 'bg-yellow-500 animate-pulse'
                : 'bg-red-500'
            }`}
          />
          <span className="font-semibold">
            WebSocket: {connectionState}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-gray-400">Online:</span> {onlineUsers.size}
          </div>
          <div>
            <span className="text-gray-400">Typing:</span> {typingUsers.size}
          </div>
          <div>
            <span className="text-gray-400">Sent:</span> {stats.messagesSent}
          </div>
          <div>
            <span className="text-gray-400">Received:</span> {stats.messagesReceived}
          </div>
        </div>
        
        {typingUsers.size > 0 && (
          <div className="text-[10px] border-t border-gray-700 pt-2">
            <div className="text-gray-400 mb-1">Typing:</div>
            {Array.from(typingUsers.entries()).map(([userId, { userName }]) => (
              <div key={userId} className="truncate">
                {userName}
              </div>
            ))}
          </div>
        )}
        
        {stats.lastActivity && (
          <div className="text-[10px] text-gray-400">
            Last: {new Date(stats.lastActivity).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  );
}

export default RealtimeContext;
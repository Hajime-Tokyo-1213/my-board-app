'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Socket } from 'socket.io-client';
import { initSocket, disconnectSocket, getSocket } from '@/lib/socket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const socketInstance = initSocket();
      
      socketInstance.on('connect', () => {
        setIsConnected(true);
        socketInstance.emit('user:join', {
          userId: session.user.id,
          email: session.user.email,
          name: session.user.name,
        });
      });

      socketInstance.on('disconnect', () => {
        setIsConnected(false);
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.emit('user:leave', {
          userId: session.user.id,
        });
        disconnectSocket();
        setSocket(null);
        setIsConnected(false);
      };
    }
  }, [session, status]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
import { NextRequest } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { Socket as NetSocket } from 'net';

interface SocketServer extends NetServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

const ioHandler = (req: NextRequest, res: any) => {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io server...');
    
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('user:join', (userData) => {
        console.log('User joined:', userData);
        socket.join(`user:${userData.userId}`);
        socket.broadcast.emit('user:online', userData);
      });

      socket.on('user:leave', (userData) => {
        console.log('User left:', userData);
        socket.leave(`user:${userData.userId}`);
        socket.broadcast.emit('user:offline', userData);
      });

      socket.on('post:new', (postData) => {
        socket.broadcast.emit('post:created', postData);
      });

      socket.on('post:like', (likeData) => {
        io.to(`user:${likeData.authorId}`).emit('notification:like', likeData);
      });

      socket.on('comment:new', (commentData) => {
        socket.broadcast.emit('comment:created', commentData);
        io.to(`user:${commentData.postAuthorId}`).emit('notification:comment', commentData);
      });

      socket.on('follow:new', (followData) => {
        io.to(`user:${followData.followedId}`).emit('notification:follow', followData);
      });

      socket.on('message:send', (messageData) => {
        io.to(`user:${messageData.recipientId}`).emit('message:received', messageData);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    res.socket.server.io = io;
  } else {
    console.log('Socket.io server already initialized');
  }
  
  res.end();
};

export { ioHandler as GET, ioHandler as POST };
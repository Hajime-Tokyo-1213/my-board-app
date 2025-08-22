import { createServer } from 'http';
import { initSocketServer } from '@/lib/socketServer';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

const PORT = process.env.SOCKET_PORT || 3001;

// HTTPサーバーを作成
const httpServer = createServer((req, res) => {
  // ヘルスチェック用のエンドポイント
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date() }));
    return;
  }
  
  // 統計情報エンドポイント
  if (req.url === '/stats') {
    const socketServer = require('@/lib/socketServer').getSocketServer();
    if (socketServer) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(socketServer.getStats()));
    } else {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Socket server not initialized' }));
    }
    return;
  }
  
  // その他のリクエストは404
  res.writeHead(404);
  res.end('Not Found');
});

// Socket.ioサーバーを初期化
const socketServer = initSocketServer(httpServer);

// サーバーを起動
httpServer.listen(PORT, () => {
  console.log(`🚀 WebSocket server is running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Statistics: http://localhost:${PORT}/stats`);
});

// グレースフルシャットダウン
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing WebSocket server');
  await socketServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing WebSocket server');
  await socketServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

export default httpServer;
import mongoose from 'mongoose';

const mockDbConnect = jest.fn().mockImplementation(async () => {
  const uri = process.env.MONGODB_URI;
  
  if (!uri || uri === '') {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  
  // 既に接続されている場合
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  
  // 開発環境でのログ
  if (process.env.NODE_ENV === 'development') {
    console.log('MongoDB connected successfully');
  }
  
  return mongoose;
});

export default mockDbConnect;
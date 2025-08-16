import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// Mongooseのグローバルな型定義を拡張
declare global {
  var mongoose: any; // `var` を使用してグローバルスコープに宣言
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}


const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set. Define it in Vercel Environment Variables (Production/Preview/Development) or .env.local for local dev.'
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// MongoDB Client for NextAuth
let clientPromise: Promise<MongoClient>;

if (MONGODB_URI) {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }
} else {
  // ビルド時にはダミーのPromiseを返す
  clientPromise = Promise.reject(new Error('MONGODB_URI is not set'));
}

// Alias for compatibility
export const connectToDatabase = dbConnect;
export { clientPromise };
export default dbConnect;
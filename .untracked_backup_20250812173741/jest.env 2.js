// テスト環境用の環境変数を設定
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
process.env.NODE_ENV = 'test';
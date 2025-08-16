const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// MongoDBに接続
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function deleteAllPosts() {
  await connectDB();
  
  const db = mongoose.connection.db;
  const postsCollection = db.collection('posts');
  
  try {
    // 削除前の投稿数を確認
    const countBefore = await postsCollection.countDocuments();
    console.log(`削除前の投稿数: ${countBefore}`);
    
    if (countBefore === 0) {
      console.log('削除する投稿がありません');
      return;
    }
    
    // すべての投稿を削除
    const result = await postsCollection.deleteMany({});
    console.log(`削除された投稿数: ${result.deletedCount}`);
    
    // 削除後の投稿数を確認
    const countAfter = await postsCollection.countDocuments();
    console.log(`削除後の投稿数: ${countAfter}`);
    
    console.log('\nすべての投稿を削除しました');
  } catch (error) {
    console.error('削除エラー:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// スクリプトを実行
deleteAllPosts().catch(console.error);
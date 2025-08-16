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

async function fixLikesField() {
  await connectDB();
  
  const db = mongoose.connection.db;
  const postsCollection = db.collection('posts');
  
  try {
    // すべての投稿を取得
    const posts = await postsCollection.find({}).toArray();
    console.log(`Found ${posts.length} posts`);
    
    for (const post of posts) {
      let updateNeeded = false;
      let newLikes = [];
      
      // likesフィールドが存在する場合
      if (post.likes && Array.isArray(post.likes)) {
        console.log(`\nProcessing post ${post._id}`);
        console.log(`Current likes:`, post.likes);
        
        // 各要素をチェック
        for (const like of post.likes) {
          if (like && typeof like === 'object' && like.toString) {
            // ObjectIDの場合、文字列に変換
            newLikes.push(like.toString());
            updateNeeded = true;
          } else if (typeof like === 'string') {
            // すでに文字列の場合はそのまま
            newLikes.push(like);
          }
        }
      } else {
        // likesフィールドが存在しない場合は初期化
        newLikes = [];
        updateNeeded = true;
      }
      
      // likesCountを更新
      const likesCount = newLikes.length;
      
      if (updateNeeded || post.likesCount !== likesCount) {
        console.log(`Updating post ${post._id}`);
        console.log(`New likes:`, newLikes);
        console.log(`Likes count:`, likesCount);
        
        await postsCollection.updateOne(
          { _id: post._id },
          { 
            $set: { 
              likes: newLikes,
              likesCount: likesCount
            }
          }
        );
        
        console.log(`Updated successfully`);
      } else {
        console.log(`Post ${post._id} - No update needed`);
      }
    }
    
    console.log('\nMigration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// スクリプトを実行
fixLikesField().catch(console.error);
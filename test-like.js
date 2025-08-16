const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function testLikes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const posts = await db.collection('posts').find({}).limit(3).toArray();
    
    console.log('\n=== 投稿のいいね情報 ===');
    posts.forEach(post => {
      console.log(`投稿ID: ${post._id}`);
      console.log(`内容: ${post.content?.substring(0, 30)}...`);
      console.log(`likes: ${JSON.stringify(post.likes)}`);
      console.log(`likesCount: ${post.likesCount}`);
      console.log('---');
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

testLikes();
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const PostSchema = new mongoose.Schema({
  content: String,
  author: mongoose.Schema.Types.ObjectId,
  authorName: String,
  authorEmail: String,
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likesCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  password: String,
  emailVerified: Date
});

async function testLikeFunction() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // テスト用ユーザーを取得
    const user = await db.collection('users').findOne({ email: '01.murakami@gmail.com' });
    if (!user) {
      console.log('Test user not found');
      return;
    }
    console.log('Test user ID:', user._id);
    
    // 最初の投稿を取得
    const post = await db.collection('posts').findOne({});
    if (!post) {
      console.log('No posts found');
      return;
    }
    
    console.log('\n=== いいね前の状態 ===');
    console.log('Post ID:', post._id);
    console.log('Content:', post.content?.substring(0, 30));
    console.log('Likes:', post.likes || []);
    console.log('Likes count:', post.likesCount || 0);
    
    // いいねを追加
    const updatedPost = await db.collection('posts').findOneAndUpdate(
      { _id: post._id },
      { 
        $addToSet: { likes: user._id },
        $inc: { likesCount: 1 }
      },
      { returnDocument: 'after' }
    );
    
    console.log('\n=== いいね後の状態 ===');
    console.log('Likes:', updatedPost.likes);
    console.log('Likes count:', updatedPost.likesCount);
    
    // 5秒待ってから取り消し
    console.log('\n5秒後にいいねを取り消します...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // いいねを取り消し
    const finalPost = await db.collection('posts').findOneAndUpdate(
      { _id: post._id },
      { 
        $pull: { likes: user._id },
        $inc: { likesCount: -1 }
      },
      { returnDocument: 'after' }
    );
    
    console.log('\n=== いいね取り消し後の状態 ===');
    console.log('Likes:', finalPost.likes);
    console.log('Likes count:', finalPost.likesCount);
    
    await mongoose.connection.close();
    console.log('\nTest completed');
  } catch (error) {
    console.error('Error:', error);
  }
}

testLikeFunction();
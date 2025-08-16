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

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

async function migratePosts() {
  try {
    // MongoDBに接続
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // likesフィールドがない投稿を検索して更新
    const result = await Post.updateMany(
      { likes: { $exists: false } },
      { 
        $set: { 
          likes: [],
          likesCount: 0
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} posts`);

    // 更新後の確認
    const posts = await Post.find({}).select('_id likes likesCount');
    console.log(`Total posts: ${posts.length}`);
    
    await mongoose.connection.close();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePosts();
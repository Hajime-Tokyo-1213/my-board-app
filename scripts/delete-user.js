const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function deleteUser(email) {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messageboardapp');
    console.log('MongoDBに接続しました');

    // Userモデルを定義
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Postモデルを定義
    const postSchema = new mongoose.Schema({}, { strict: false });
    const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

    // ユーザーを検索
    const user = await User.findOne({ email });
    
    if (user) {
      console.log(`ユーザー見つかりました: ${email}`);
      console.log('ユーザー情報:', {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      });

      // ユーザーの投稿を削除
      const postsDeleted = await Post.deleteMany({ 
        $or: [
          { authorId: user._id.toString() },
          { authorEmail: email }
        ]
      });
      console.log(`${postsDeleted.deletedCount}件の投稿を削除しました`);

      // ユーザーを削除
      await User.deleteOne({ email });
      console.log(`ユーザー ${email} を削除しました`);
    } else {
      console.log(`ユーザー ${email} は見つかりませんでした`);
    }

    // 確認のため、すべてのユーザーをリスト
    const allUsers = await User.find({}, 'email name emailVerified');
    console.log('\n現在登録されているユーザー:');
    allUsers.forEach(u => {
      console.log(`- ${u.email} (${u.name}) - メール確認: ${u.emailVerified ? '済' : '未'}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nMongoDBから切断しました');
  }
}

// コマンドライン引数からメールアドレスを取得
const email = process.argv[2];
if (!email) {
  console.log('使用方法: node scripts/delete-user.js <email>');
  console.log('例: node scripts/delete-user.js murakami@komei.jp');
  process.exit(1);
}

deleteUser(email);
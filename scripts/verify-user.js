const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function verifyUser(email) {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messageboardapp');
    console.log('MongoDBに接続しました');

    // Userモデルを定義
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // ユーザーを検索
    const user = await User.findOne({ email });
    
    if (user) {
      console.log(`ユーザー見つかりました: ${email}`);
      console.log('現在の状態:', {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      });

      // メール確認を完了に設定
      user.emailVerified = new Date();
      await user.save();
      
      console.log(`✅ ${email} のメール確認を完了しました`);
      console.log('更新後の状態:', {
        emailVerified: user.emailVerified
      });
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
  console.log('使用方法: node scripts/verify-user.js <email>');
  console.log('例: node scripts/verify-user.js 07.hajime.tokyo@gmail.com');
  process.exit(1);
}

verifyUser(email);
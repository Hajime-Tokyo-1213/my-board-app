const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function forceVerifyUser(email) {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/messageboardapp');
    console.log('MongoDBに接続しました');

    // Userモデルを定義
    const userSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // ユーザーを検索して更新
    const result = await User.updateOne(
      { email },
      { 
        $set: { 
          emailVerified: new Date(),
          verificationToken: null
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log(`✅ ${email} のメール確認を強制的に完了しました`);
      console.log('更新結果:', result);
      
      // 更新後のユーザーを確認
      const updatedUser = await User.findOne({ email });
      console.log('更新後のユーザー情報:', {
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: updatedUser.emailVerified,
        verificationToken: updatedUser.verificationToken
      });
    } else {
      console.log(`ユーザー ${email} は見つかりませんでした`);
    }

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
  console.log('使用方法: node scripts/force-verify-user.js <email>');
  console.log('例: node scripts/force-verify-user.js 07.hajime.tokyo@gmail.com');
  process.exit(1);
}

forceVerifyUser(email);
#!/usr/bin/env node

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, unique: true, sparse: true },
  bio: { type: String },
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  emailVerified: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Follow schema
const followSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

followSchema.index({ follower: 1, following: 1 }, { unique: true });

const Follow = mongoose.models.Follow || mongoose.model('Follow', followSchema);

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    log('✓ Connected to MongoDB', 'green');
  } catch (error) {
    log('✗ Failed to connect to MongoDB', 'red');
    console.error(error);
    process.exit(1);
  }
}

async function setupTestData() {
  log('\n=== フォローボタンテスト用データセットアップ ===\n', 'cyan');

  // テストユーザーデータ
  const testUsers = [
    {
      email: 'follow.test1@example.com',
      password: 'Test123!',
      name: 'Alice Test',
      username: 'alice_test',
      bio: 'フォローテスト用ユーザー1',
    },
    {
      email: 'follow.test2@example.com',
      password: 'Test123!',
      name: 'Bob Test',
      username: 'bob_test',
      bio: 'フォローテスト用ユーザー2',
    },
    {
      email: 'follow.test3@example.com',
      password: 'Test123!',
      name: 'Charlie Test',
      username: 'charlie_test',
      bio: 'フォローテスト用ユーザー3',
    },
  ];

  const createdUsers = [];

  // ユーザー作成
  log('📝 テストユーザーを作成中...', 'yellow');
  for (const userData of testUsers) {
    try {
      // 既存ユーザーをチェック
      let user = await User.findOne({ email: userData.email });
      
      if (user) {
        log(`   既存: ${userData.name} (${userData.email})`, 'blue');
      } else {
        user = await User.create(userData);
        log(`   ✓ 作成: ${userData.name} (${userData.email})`, 'green');
      }
      
      createdUsers.push(user);
    } catch (error) {
      log(`   ✗ エラー: ${userData.email} - ${error.message}`, 'red');
    }
  }

  // フォロー関係を設定
  if (createdUsers.length >= 3) {
    log('\n🔗 フォロー関係を設定中...', 'yellow');
    
    try {
      // Alice → Bob
      const follow1 = await Follow.findOne({
        follower: createdUsers[0]._id,
        following: createdUsers[1]._id,
      });
      
      if (!follow1) {
        await Follow.create({
          follower: createdUsers[0]._id,
          following: createdUsers[1]._id,
        });
        await User.findByIdAndUpdate(createdUsers[0]._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(createdUsers[1]._id, { $inc: { followersCount: 1 } });
        log('   ✓ Alice → Bob', 'green');
      } else {
        log('   既存: Alice → Bob', 'blue');
      }

      // Bob → Alice (相互フォロー)
      const follow2 = await Follow.findOne({
        follower: createdUsers[1]._id,
        following: createdUsers[0]._id,
      });
      
      if (!follow2) {
        await Follow.create({
          follower: createdUsers[1]._id,
          following: createdUsers[0]._id,
        });
        await User.findByIdAndUpdate(createdUsers[1]._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(createdUsers[0]._id, { $inc: { followersCount: 1 } });
        log('   ✓ Bob → Alice (相互フォロー)', 'green');
      } else {
        log('   既存: Bob → Alice', 'blue');
      }

      // Charlie → Alice
      const follow3 = await Follow.findOne({
        follower: createdUsers[2]._id,
        following: createdUsers[0]._id,
      });
      
      if (!follow3) {
        await Follow.create({
          follower: createdUsers[2]._id,
          following: createdUsers[0]._id,
        });
        await User.findByIdAndUpdate(createdUsers[2]._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(createdUsers[0]._id, { $inc: { followersCount: 1 } });
        log('   ✓ Charlie → Alice', 'green');
      } else {
        log('   既存: Charlie → Alice', 'blue');
      }

    } catch (error) {
      log(`   ✗ フォロー関係設定エラー: ${error.message}`, 'red');
    }
  }

  // 作成結果を表示
  log('\n📊 セットアップ結果:', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  
  for (const user of createdUsers) {
    const refreshedUser = await User.findById(user._id);
    log(`\n👤 ${refreshedUser.name}`, 'yellow');
    log(`   Email: ${refreshedUser.email}`, 'blue');
    log(`   ID: ${refreshedUser._id}`, 'blue');
    log(`   フォロワー: ${refreshedUser.followersCount}`, 'blue');
    log(`   フォロー中: ${refreshedUser.followingCount}`, 'blue');
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('\n🎯 テスト方法:', 'cyan');
  log('1. npm run dev でサーバーを起動', 'blue');
  log('2. http://localhost:3000/test/follow-button にアクセス', 'blue');
  log('3. 上記のメールアドレスでログイン（パスワード: Test123!）', 'blue');
  log('4. 表示されたユーザーIDを使ってフォローボタンをテスト', 'blue');
  
  return createdUsers;
}

async function showExistingUsers() {
  log('\n📋 既存のユーザー一覧:', 'cyan');
  
  const users = await User.find({}).limit(10).sort({ createdAt: -1 });
  
  if (users.length === 0) {
    log('   ユーザーが見つかりません', 'yellow');
  } else {
    for (const user of users) {
      log(`\n   👤 ${user.name}`, 'yellow');
      log(`      Email: ${user.email}`, 'blue');
      log(`      ID: ${user._id}`, 'blue');
      log(`      フォロワー: ${user.followersCount} | フォロー中: ${user.followingCount}`, 'blue');
    }
  }
}

async function main() {
  try {
    await connectDB();
    
    // 既存ユーザーを表示
    await showExistingUsers();
    
    // テストデータをセットアップ
    await setupTestData();
    
    log('\n✅ セットアップ完了！', 'green');
    
  } catch (error) {
    log('✗ セットアップ失敗', 'red');
    console.error(error);
  } finally {
    await mongoose.connection.close();
    log('\n✓ データベース接続を閉じました', 'green');
    process.exit(0);
  }
}

// 実行
main();
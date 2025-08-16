# データベース仕様書

## 1. 概要

### 1.1 データベース情報
- **種類**: MongoDB（NoSQLドキュメントデータベース）
- **ODM**: Mongoose 8.17.0
- **接続方式**: MongoDB Connection String
- **推奨環境**: MongoDB Atlas（クラウド）/ MongoDB 5.0以上（ローカル）

### 1.2 データベース設計方針
- **スキーマ設計**: Mongooseによる厳密なスキーマ定義
- **リレーション**: 参照型（Reference）と埋め込み型（Embedded）の混合
- **インデックス**: パフォーマンス最適化のための適切なインデックス設定
- **トランザクション**: 必要に応じてトランザクション処理を実装

---

## 2. コレクション一覧

| コレクション名 | 説明 | 主キー | レコード数（想定） |
|--------------|------|--------|-----------------|
| users | ユーザー情報 | _id (ObjectId) | ~10,000 |
| posts | 投稿情報 | _id (ObjectId) | ~100,000 |
| sessions | セッション情報（NextAuth） | _id (ObjectId) | アクティブユーザー数 |
| accounts | 外部認証情報（NextAuth） | _id (ObjectId) | ユーザー数と同等 |

---

## 3. コレクション詳細仕様

### 3.1 users コレクション

#### スキーマ定義（models/User.ts）

```javascript
{
  _id: ObjectId,              // 主キー（自動生成）
  email: String,              // メールアドレス（必須、一意、小文字）
  password: String,           // パスワードハッシュ（必須）
  name: String,              // ユーザー名（必須、最大50文字）
  bio: String,               // 自己紹介（最大200文字）
  image: String,             // プロフィール画像URL
  emailVerified: Boolean,    // メール確認済みフラグ（デフォルト: false）
  emailVerificationToken: String,    // メール確認トークン
  emailVerificationExpires: Date,    // トークン有効期限
  resetPasswordToken: String,        // パスワードリセットトークン
  resetPasswordExpires: Date,        // リセットトークン有効期限
  createdAt: Date,          // 作成日時（自動）
  updatedAt: Date           // 更新日時（自動）
}
```

#### インデックス
- `email`: 一意インデックス（ユニーク制約）
- `emailVerificationToken`: 単一インデックス
- `resetPasswordToken`: 単一インデックス

#### データ例
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "user@example.com",
  "password": "$2b$10$K7L1OJ0TfgH5KqG7...", // bcryptハッシュ
  "name": "山田太郎",
  "bio": "Web開発者です。よろしくお願いします。",
  "image": null,
  "emailVerified": true,
  "emailVerificationToken": null,
  "emailVerificationExpires": null,
  "resetPasswordToken": null,
  "resetPasswordExpires": null,
  "createdAt": "2024-01-15T09:30:00.000Z",
  "updatedAt": "2024-01-15T09:30:00.000Z"
}
```

### 3.2 posts コレクション

#### スキーマ定義（models/Post.ts）

```javascript
{
  _id: ObjectId,              // 主キー（自動生成）
  title: String,              // タイトル（必須、最大100文字、トリム）
  content: String,            // 本文（必須、最大1000文字、トリム）
  authorId: String,           // 投稿者ID（必須、User._idの文字列）
  authorName: String,         // 投稿者名（必須）
  authorEmail: String,        // 投稿者メール（必須）
  authorImage: String,        // 投稿者画像URL（nullable）
  likes: [String],           // いいねしたユーザーIDの配列
  likesCount: Number,        // いいね数（デフォルト: 0）
  createdAt: Date,           // 作成日時（自動）
  updatedAt: Date            // 更新日時（自動）
}
```

#### インデックス
- `createdAt`: 降順インデックス（新着順ソート用）
- `authorId, createdAt`: 複合インデックス（ユーザー別投稿一覧用）

#### データ例
```json
{
  "_id": "507f191e810c19729de860ea",
  "title": "Next.js 15の新機能について",
  "content": "Next.js 15では、App Routerが改善され、パフォーマンスが向上しました。",
  "authorId": "507f1f77bcf86cd799439011",
  "authorName": "山田太郎",
  "authorEmail": "user@example.com",
  "authorImage": null,
  "likes": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "likesCount": 2,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### 3.3 sessions コレクション（NextAuth管理）

#### スキーマ定義

```javascript
{
  _id: ObjectId,
  sessionToken: String,      // セッショントークン（一意）
  userId: ObjectId,          // ユーザーID（users._idの参照）
  expires: Date              // 有効期限
}
```

### 3.4 accounts コレクション（NextAuth管理）

#### スキーマ定義

```javascript
{
  _id: ObjectId,
  userId: ObjectId,          // ユーザーID（users._idの参照）
  type: String,              // アカウントタイプ
  provider: String,          // プロバイダー名
  providerAccountId: String, // プロバイダーアカウントID
  // その他プロバイダー固有のフィールド
}
```

---

## 4. リレーション設計

### 4.1 リレーション図

```
users (1) ─────┬───── (N) posts
              │         ├─ authorId (参照)
              │         ├─ authorName (埋め込み)
              │         ├─ authorEmail (埋め込み)
              │         └─ authorImage (埋め込み)
              │
              └───── (N) likes (posts.likes配列内)
```

### 4.2 設計の理由

#### 参照型を使用する箇所
- `posts.authorId` → `users._id`: ユーザー情報の整合性を保つため

#### 埋め込み型を使用する箇所
- `posts.authorName`, `authorEmail`, `authorImage`: 
  - 投稿一覧表示時のパフォーマンス向上
  - JOINクエリを避けるため
  - ユーザー名の変更頻度が低いため

#### 配列型を使用する箇所
- `posts.likes`: 
  - いいねしたユーザーIDのリスト
  - 配列サイズが制限される（1投稿あたり最大数千程度）

---

## 5. インデックス戦略

### 5.1 設定済みインデックス

| コレクション | フィールド | タイプ | 目的 |
|------------|-----------|--------|------|
| users | email | Unique | メールアドレスの一意性保証、ログイン高速化 |
| users | emailVerificationToken | Single | トークン検証の高速化 |
| users | resetPasswordToken | Single | トークン検証の高速化 |
| posts | createdAt | Single (DESC) | 新着順ソートの高速化 |
| posts | authorId, createdAt | Compound | ユーザー別投稿一覧の高速化 |

### 5.2 インデックス設定コマンド

```javascript
// Mongooseでの自動設定
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });

PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });
```

---

## 6. データ整合性とバリデーション

### 6.1 バリデーションルール

#### users コレクション
- `email`: 必須、メール形式、一意
- `password`: 必須、8文字以上（保存前にハッシュ化）
- `name`: 必須、最大50文字
- `bio`: 最大200文字

#### posts コレクション
- `title`: 必須、最大100文字、前後の空白削除
- `content`: 必須、最大1000文字、前後の空白削除
- `authorId`: 必須、有効なユーザーID

### 6.2 データ整合性の保証

- **カスケード削除**: ユーザー削除時の投稿削除（未実装、要検討）
- **トランザクション**: 複数コレクションの更新時
- **ミドルウェア**: Mongoose pre/postフックによる自動処理

---

## 7. パフォーマンス最適化

### 7.1 クエリ最適化

```javascript
// 効率的なページネーション
Post.find()
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();  // パフォーマンス向上のためlean()を使用

// 必要なフィールドのみ取得
Post.find({}, 'title content authorName createdAt likesCount');
```

### 7.2 接続プール設定

```javascript
// lib/mongodb.ts
const options = {
  maxPoolSize: 10,      // 最大接続数
  minPoolSize: 2,       // 最小接続数
  maxIdleTimeMS: 10000, // アイドルタイムアウト
};
```

---

## 8. バックアップとリカバリ

### 8.1 バックアップ戦略
- **頻度**: 日次自動バックアップ
- **保持期間**: 30日間
- **方式**: MongoDB Atlas自動バックアップ（推奨）

### 8.2 リカバリ手順
1. MongoDB Atlasダッシュボードからリストア
2. ポイントインタイムリカバリ（PITR）対応
3. RPO: 24時間、RTO: 4時間

---

## 9. セキュリティ対策

### 9.1 アクセス制御
- **認証**: MongoDB接続文字列による認証
- **暗号化**: TLS/SSL通信の強制
- **ネットワーク**: IPホワイトリスト設定

### 9.2 データ保護
- **パスワード**: bcryptによるハッシュ化（saltラウンド: 10）
- **トークン**: crypto.randomBytesによる安全な乱数生成
- **サニタイゼーション**: MongoDBインジェクション対策

---

## 10. マイグレーション

### 10.1 スキーマ変更手順
1. 新フィールドをオプショナルで追加
2. データ移行スクリプトの実行
3. 必須制約の追加
4. 旧フィールドの削除

### 10.2 サンプルマイグレーションスクリプト

```javascript
// scripts/migrate-likes.js
const mongoose = require('mongoose');
require('dotenv').config();

async function migrateLikes() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const posts = await Post.find({});
  for (const post of posts) {
    // ObjectIDを文字列に変換
    post.likes = post.likes.map(id => id.toString());
    await post.save();
  }
  
  console.log('Migration completed');
  process.exit(0);
}
```

---

## 11. 監視項目

### 11.1 メトリクス
- **接続数**: アクティブ/アイドル接続数
- **クエリパフォーマンス**: 遅いクエリの検出
- **ストレージ**: データサイズ、インデックスサイズ
- **レプリケーション**: レプリカセットの状態

### 11.2 アラート設定
- 接続エラー率 > 1%
- クエリ実行時間 > 1秒
- ストレージ使用率 > 80%
- レプリケーション遅延 > 10秒

---

## 12. 改訂履歴

| 版 | 日付 | 内容 | 作成者 |
|----|------|------|--------|
| 1.0 | 2025-08-16 | 初版作成 | Claude Code |
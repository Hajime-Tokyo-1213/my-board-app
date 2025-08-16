# データベース仕様書 - オープン掲示板システム

## 1. データベース概要

### 1.1 基本情報
- **データベース種別**: NoSQL（ドキュメント型）
- **使用DBMS**: MongoDB Atlas
- **バージョン**: 6.0以上
- **接続方式**: MongoDB接続文字列（SRV形式）
- **ORM/ODM**: Mongoose 8.17.0

### 1.2 接続情報
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### 1.3 環境別設定

| 環境 | データベース名 | 用途 |
|------|---------------|------|
| 開発 | boardDB | 開発・テスト用 |
| 本番 | boardDB_prod | 本番運用（未構築） |

## 2. コレクション設計

### 2.1 posts コレクション

#### 概要
投稿データを格納するメインコレクション

#### スキーマ定義
```typescript
const PostSchema = new Schema({
  content: { 
    type: String, 
    required: true,
    maxlength: 200 
  }
}, { 
  timestamps: true 
});
```

#### フィールド仕様

| フィールド名 | 型 | 必須 | 制約 | 説明 |
|------------|-----|------|------|------|
| _id | ObjectId | ○ | 自動生成 | プライマリキー |
| content | String | ○ | 最大200文字 | 投稿内容 |
| createdAt | Date | ○ | 自動生成 | 作成日時 |
| updatedAt | Date | ○ | 自動更新 | 更新日時 |
| __v | Number | ○ | 自動管理 | バージョンキー |

#### インデックス

| インデックス名 | フィールド | タイプ | 用途 |
|--------------|-----------|--------|------|
| _id_ | _id | 昇順 | プライマリキー（自動） |
| createdAt_-1 | createdAt | 降順 | 投稿一覧のソート用（推奨） |

## 3. データモデル

### 3.1 Mongooseモデル定義

```typescript
// /src/models/Post.ts
import mongoose, { Schema, Document, models } from 'mongoose';

export interface IPost extends Document {
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema({
  content: { 
    type: String, 
    required: true,
    maxlength: 200 
  }
}, { 
  timestamps: true 
});

const Post = models.Post || mongoose.model<IPost>('Post', PostSchema);
```

### 3.2 バリデーション

| 項目 | ルール | エラーメッセージ |
|------|--------|----------------|
| content必須 | required: true | Path `content` is required |
| content長さ | maxlength: 200 | Path `content` exceeds maximum length |

## 4. データ操作

### 4.1 CRUD操作

#### Create（作成）
```javascript
const post = await Post.create({ content: "投稿内容" });
```

#### Read（取得）
```javascript
// 一覧取得
const posts = await Post.find({}).sort({ createdAt: -1 });

// 単一取得
const post = await Post.findById(id);
```

#### Update（更新）
```javascript
const post = await Post.findByIdAndUpdate(
  id, 
  { content: "更新内容" },
  { new: true, runValidators: true }
);
```

#### Delete（削除）
```javascript
const post = await Post.findByIdAndDelete(id);
```

### 4.2 トランザクション
現在の実装では単一ドキュメント操作のみのため、トランザクション未使用。

## 5. 接続管理

### 5.1 接続プーリング実装

```typescript
// /src/lib/mongodb.ts
const cached = global.mongoose || { conn: null, promise: null };

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn;
  }
  
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI!, opts);
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}
```

### 5.2 接続オプション
- **bufferCommands**: false（コマンドバッファリング無効）
- **retryWrites**: true（書き込みリトライ有効）
- **w**: majority（過半数レプリカ確認）

## 6. データ例

### 6.1 投稿ドキュメント例
```json
{
  "_id": {
    "$oid": "689436f5e7865cc4b69f0021"
  },
  "content": "オープン掲示板へようこそ！誰でも自由に投稿できます。",
  "createdAt": {
    "$date": "2025-08-07T05:17:41.292Z"
  },
  "updatedAt": {
    "$date": "2025-08-07T05:17:41.292Z"
  },
  "__v": 0
}
```

## 7. バックアップとリカバリ

### 7.1 MongoDB Atlas自動バックアップ
- **頻度**: 毎日
- **保持期間**: 7日間（無料プラン）
- **リストア**: Atlas UIから実行可能

### 7.2 手動バックアップ
```bash
# エクスポート
mongodump --uri="mongodb+srv://..." --out=./backup

# インポート
mongorestore --uri="mongodb+srv://..." ./backup
```

## 8. パフォーマンス最適化

### 8.1 実装済み最適化
- 接続プーリングによる再利用
- createdAtフィールドでのソート（インデックス推奨）
- 必要最小限のフィールド取得

### 8.2 推奨最適化
```javascript
// インデックス作成（初回のみ実行）
db.posts.createIndex({ createdAt: -1 });

// 複合インデックス（将来の検索機能用）
db.posts.createIndex({ content: "text" });
```

## 9. セキュリティ

### 9.1 実装済みセキュリティ
- 接続文字列の環境変数管理
- MongooseによるNoSQL Injection対策
- スキーマバリデーション

### 9.2 MongoDB Atlas設定
- **ネットワークアクセス**: IPホワイトリスト設定
- **認証**: SCRAM-SHA-256
- **暗号化**: TLS/SSL接続

### 9.3 環境変数のセキュリティ
⚠️ **重要なセキュリティ注意事項**:
- `.env.local`ファイルには機密情報（データベース接続文字列）が含まれる
- **必ず`.gitignore`に含めてGit管理から除外すること**
- 本番環境では環境変数として安全に設定
- 接続文字列にはユーザー名とパスワードが含まれるため厳重に管理

```bash
# .gitignore に必ず含める
.env.local
.env*.local
```

## 10. 監視とメトリクス

### 10.1 MongoDB Atlas監視
- リアルタイムパフォーマンス
- 接続数
- 操作レイテンシ
- ストレージ使用量

### 10.2 アプリケーションログ
```javascript
console.log('Connecting to MongoDB...');
console.log('Connected to MongoDB successfully');
console.log(`Found ${posts.length} posts`);
```

## 11. 容量計画

### 11.1 ストレージ計算
- 平均投稿サイズ: 約500バイト
- 1万投稿: 約5MB
- 10万投稿: 約50MB
- Atlas無料枠: 512MB（約100万投稿分）

### 11.2 スケーリング戦略
- 垂直スケール: Atlasティアアップグレード
- 水平スケール: シャーディング（将来対応）
- アーカイブ: 古い投稿の別コレクション移動

## 12. マイグレーション

### 12.1 スキーマ変更手順
1. 新フィールドをオプショナルで追加
2. 既存データの移行スクリプト実行
3. フィールドを必須に変更（必要な場合）

### 12.2 マイグレーション例
```javascript
// 例：カテゴリフィールド追加
db.posts.updateMany(
  { category: { $exists: false } },
  { $set: { category: "general" } }
);
```

## 13. 今後の拡張予定

### 13.1 新規コレクション
- users: ユーザー管理（認証実装時）
- comments: コメント機能
- likes: いいね機能
- tags: タグ管理

### 13.2 スキーマ拡張
- 投稿者情報（IPアドレス、UA）
- カテゴリ/タグ
- 添付ファイル参照
- 既読管理
# API仕様書 - オープン掲示板システム

## 1. API概要

### 1.1 基本情報
- **ベースURL**: `http://localhost:3000/api`
- **プロトコル**: HTTP/HTTPS
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **認証**: なし（オープンアクセス）

### 1.2 共通レスポンス形式

#### 成功時
```json
{
  "success": true,
  "data": {
    // レスポンスデータ
  }
}
```

#### エラー時
```json
{
  "success": false,
  "error": "エラーメッセージ",
  "details": "詳細情報（開発環境のみ）"
}
```

### 1.3 HTTPステータスコード

| コード | 意味 | 使用場面 |
|--------|------|----------|
| 200 | OK | 取得・更新・削除成功 |
| 201 | Created | 作成成功 |
| 400 | Bad Request | バリデーションエラー |
| 404 | Not Found | リソースが見つからない |
| 500 | Internal Server Error | サーバーエラー |

## 2. エンドポイント一覧

| メソッド | パス | 説明 |
|----------|------|------|
| GET | /api/posts | 投稿一覧を取得 |
| GET | /api/posts/[id] | 特定の投稿を取得 |
| POST | /api/posts | 新規投稿を作成 |
| PUT | /api/posts/[id] | 投稿を更新 |
| DELETE | /api/posts/[id] | 投稿を削除 |

## 3. API詳細

### 3.1 投稿一覧取得

#### エンドポイント
```
GET /api/posts
```

#### リクエスト
パラメータなし

#### レスポンス
```json
{
  "success": true,
  "data": [
    {
      "_id": "689436f5e7865cc4b69f0021",
      "content": "投稿内容",
      "createdAt": "2025-08-07T05:17:41.292Z",
      "updatedAt": "2025-08-07T05:17:41.292Z",
      "__v": 0
    }
  ]
}
```

#### フィールド説明
| フィールド | 型 | 説明 |
|-----------|-----|------|
| _id | string | 投稿の一意識別子（MongoDB ObjectId） |
| content | string | 投稿内容 |
| createdAt | string | 作成日時（ISO 8601形式） |
| updatedAt | string | 更新日時（ISO 8601形式） |
| __v | number | MongoDBバージョンキー |

#### 実装詳細
- ソート順: 作成日時の降順（新しい順）
- 件数制限: なし（将来的にページネーション追加予定）

### 3.2 特定投稿取得

#### エンドポイント
```
GET /api/posts/[id]
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectId） |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "_id": "689436f5e7865cc4b69f0021",
    "content": "投稿内容",
    "createdAt": "2025-08-07T05:17:41.292Z",
    "updatedAt": "2025-08-07T05:17:41.292Z",
    "__v": 0
  }
}
```

#### レスポンス（エラー時）
```json
{
  "success": false,
  "error": "Post not found"
}
```

### 3.3 投稿作成

#### エンドポイント
```
POST /api/posts
```

#### リクエストボディ
```json
{
  "content": "投稿内容"
}
```

#### リクエストフィールド
| フィールド | 型 | 必須 | 制約 | 説明 |
|-----------|-----|------|------|------|
| content | string | ○ | 1-200文字 | 投稿内容 |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "_id": "689436f5e7865cc4b69f0021",
    "content": "投稿内容",
    "createdAt": "2025-08-07T05:17:41.292Z",
    "updatedAt": "2025-08-07T05:17:41.292Z",
    "__v": 0
  }
}
```

#### バリデーションエラー
| 条件 | エラーメッセージ | ステータス |
|------|-----------------|------------|
| contentが空 | 投稿内容は必須です | 400 |
| content > 200文字 | 投稿は200文字以内にしてください | 400 |

### 3.4 投稿更新

#### エンドポイント
```
PUT /api/posts/[id]
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectId） |

#### リクエストボディ
```json
{
  "content": "更新後の投稿内容"
}
```

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {
    "_id": "689436f5e7865cc4b69f0021",
    "content": "更新後の投稿内容",
    "createdAt": "2025-08-07T05:17:41.292Z",
    "updatedAt": "2025-08-07T05:20:15.123Z",
    "__v": 0
  }
}
```

#### エラーケース
| 条件 | エラーメッセージ | ステータス |
|------|-----------------|------------|
| IDが存在しない | Post not found | 404 |
| contentが空 | 投稿内容は必須です | 400 |
| content > 200文字 | 投稿は200文字以内にしてください | 400 |

### 3.5 投稿削除

#### エンドポイント
```
DELETE /api/posts/[id]
```

#### パスパラメータ
| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| id | string | ○ | 投稿ID（MongoDB ObjectId） |

#### レスポンス（成功時）
```json
{
  "success": true,
  "data": {}
}
```

#### レスポンス（エラー時）
```json
{
  "success": false,
  "error": "Post not found"
}
```

## 4. エラーハンドリング

### 4.1 共通エラー

| エラータイプ | 原因 | 対処法 |
|-------------|------|--------|
| MongoDB接続エラー | DB接続失敗 | 環境変数MONGODB_URIを確認 |
| バリデーションエラー | 不正な入力値 | エラーメッセージに従って修正 |
| キャストエラー | 不正なObjectId | 正しいID形式を使用 |

### 4.2 エラーレスポンス例

#### MongoDB接続エラー
```json
{
  "success": false,
  "error": "Failed to fetch posts",
  "details": "MongoServerError: Authentication failed"
}
```

#### バリデーションエラー
```json
{
  "success": false,
  "error": "投稿は200文字以内にしてください"
}
```

## 5. 実装技術詳細

### 5.1 使用技術
- **フレームワーク**: Next.js 15.4.5 App Router
- **言語**: TypeScript
- **データベース接続**: Mongoose 8.17.0
- **非同期処理**: async/await

#### ⚠️ Next.js 15 重要な変更点
動的ルートのparamsがPromiseとして扱われるようになりました：

```typescript
// 旧バージョン
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // 直接アクセス
}

// Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // awaitが必要
}
```

### 5.2 ミドルウェア
- **CORS**: Next.jsデフォルト設定
- **ボディパーサー**: Next.js組み込み
- **エラーハンドリング**: try-catch

### 5.3 データベース接続
```typescript
// 接続プーリング実装
const cached = global.mongoose || { conn: null, promise: null };
```

## 6. セキュリティ考慮事項

### 6.1 実装済み対策
- XSS: React自動エスケープ
- NoSQL Injection: Mongoose使用
- 環境変数: .env.localで管理

### 6.2 推奨事項
- HTTPS使用（本番環境）
- レート制限の実装
- CORSポリシーの設定

## 7. パフォーマンス

### 7.1 最適化実装
- DB接続プーリング
- インデックス: createdAtフィールド
- レスポンス圧縮: Next.js自動

### 7.2 計測値
- 平均応答時間: 100-200ms
- 最大同時接続: 未計測
- スループット: 未計測

## 8. 今後の拡張予定

### 8.1 機能追加
- ページネーション
- 検索機能
- タグ機能
- いいね機能

### 8.2 API改善
- GraphQL対応
- WebSocket対応
- キャッシュ実装
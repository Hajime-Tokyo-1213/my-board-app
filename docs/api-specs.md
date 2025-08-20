# My Board App API仕様書

## 概要

このドキュメントは、My Board App（掲示板アプリケーション）のAPI仕様について説明します。このAPIはNext.js App Routerを使用して構築され、MongoDBをデータベースとして使用しています。

## 基本情報

- **ベースURL**: `https://yourdomain.com/api` (本番環境) / `http://localhost:3000/api` (開発環境)
- **認証方式**: NextAuth.js (JWT Token)
- **データフォーマット**: JSON
- **文字エンコーディング**: UTF-8

## 認証要件

多くのAPIエンドポイントでは認証が必要です。認証が必要なエンドポイントには🔒マークを付けています。

### 認証方法
- NextAuth.jsのセッション認証を使用
- JWTトークンによるセッション管理
- セッション有効期限: 30日

## エンドポイント一覧

### 認証関連 API
| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET/POST | /api/auth/[...nextauth] | NextAuth.js認証エンドポイント | - |
| POST | /api/auth/register | ユーザー登録 | - |
| POST | /api/auth/verify-email | メール確認 | - |
| POST | /api/auth/reset-password | パスワードリセット要求 | - |
| PUT | /api/auth/reset-password | パスワードリセット実行 | - |

### 投稿関連 API
| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/posts | 投稿一覧取得（ページネーション対応） | - |
| POST | /api/posts | 新規投稿作成 | 🔒 |
| GET | /api/posts/[id] | 投稿詳細取得 | - |
| PUT | /api/posts/[id] | 投稿更新（投稿者のみ） | 🔒 |
| DELETE | /api/posts/[id] | 投稿削除（投稿者のみ） | 🔒 |
| POST | /api/posts/[id]/like | いいね追加/削除 | 🔒 |

### ユーザー関連 API
| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| GET | /api/users/[userId] | ユーザー詳細取得 | - |
| GET | /api/profile | プロフィール取得 | 🔒 |
| PUT | /api/profile | プロフィール更新 | 🔒 |

## API詳細仕様

### 1. 認証関連 API

#### 1.1 NextAuth.js認証エンドポイント
```
GET/POST /api/auth/[...nextauth]
```
NextAuth.jsが提供する認証エンドポイントです。

**機能**: ログイン、ログアウト、セッション管理

#### 1.2 ユーザー登録 
```
POST /api/auth/register
```

**説明**: 新規ユーザーを登録し、確認メールを送信します。

**リクエストボディ**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "ユーザー名"
}
```

**バリデーション**:
- email: 必須、有効なメールアドレス形式
- password: 必須、8文字以上
- name: 必須

**レスポンス**:
```json
{
  "message": "登録が完了しました。確認メールをご確認ください。"
}
```

**エラー**:
- `400`: バリデーションエラー
- `400`: メールアドレス既存エラー
- `500`: サーバーエラー

#### 1.3 メール確認
```
POST /api/auth/verify-email
```

**説明**: メールアドレスの確認を行います。

**リクエストボディ**:
```json
{
  "token": "verification_token_here"
}
```

**レスポンス**:
```json
{
  "message": "メールアドレスが確認されました"
}
```

#### 1.4 パスワードリセット要求
```
POST /api/auth/reset-password
```

**説明**: パスワードリセット用のリンクをメールで送信します。

**リクエストボディ**:
```json
{
  "email": "user@example.com"
}
```

**レスポンス**:
```json
{
  "message": "メールアドレスが登録されている場合、パスワードリセットのリンクを送信しました。"
}
```

#### 1.5 パスワードリセット実行
```
PUT /api/auth/reset-password
```

**説明**: 新しいパスワードを設定します。

**リクエストボディ**:
```json
{
  "token": "reset_token_here",
  "password": "new_password123"
}
```

**レスポンス**:
```json
{
  "message": "パスワードがリセットされました"
}
```

### 2. 投稿関連 API

#### 2.1 投稿一覧取得
```
GET /api/posts
```

**説明**: 投稿一覧をページネーション付きで取得します。

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの表示数（デフォルト: 10）

**例**: `/api/posts?page=2&limit=20`

**レスポンス**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "投稿ID",
      "title": "投稿タイトル",
      "content": "投稿内容",
      "authorId": "作成者ID",
      "authorName": "作成者名",
      "authorEmail": "作成者メール",
      "authorImage": "作成者画像URL",
      "likes": ["ユーザーID1", "ユーザーID2"],
      "likesCount": 2,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 50,
    "limit": 10,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

#### 2.2 新規投稿作成 🔒
```
POST /api/posts
```

**説明**: 新しい投稿を作成します（認証必須）。

**リクエストボディ**:
```json
{
  "title": "投稿タイトル",
  "content": "投稿内容"
}
```

**バリデーション**:
- title: 必須、100文字以内
- content: 必須、1000文字以内

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "_id": "投稿ID",
    "title": "投稿タイトル",
    "content": "投稿内容",
    "authorId": "作成者ID",
    "authorName": "作成者名",
    "authorEmail": "作成者メール",
    "authorImage": "作成者画像URL",
    "likes": [],
    "likesCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**エラー**:
- `401`: 認証が必要
- `400`: バリデーションエラー
- `500`: サーバーエラー

#### 2.3 投稿詳細取得
```
GET /api/posts/[id]
```

**説明**: 指定されたIDの投稿詳細を取得します。

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "_id": "投稿ID",
    "title": "投稿タイトル",
    "content": "投稿内容",
    "authorId": "作成者ID",
    "authorName": "作成者名",
    "authorEmail": "作成者メール",
    "authorImage": "作成者画像URL",
    "likes": ["ユーザーID1", "ユーザーID2"],
    "likesCount": 2,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**エラー**:
- `404`: 投稿が見つからない
- `500`: サーバーエラー

#### 2.4 投稿更新 🔒
```
PUT /api/posts/[id]
```

**説明**: 自分の投稿を更新します（認証必須、投稿者のみ）。

**リクエストボディ**:
```json
{
  "title": "更新後タイトル",
  "content": "更新後内容"
}
```

**バリデーション**:
- title: 必須、100文字以内
- content: 必須、1000文字以内

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "_id": "投稿ID",
    "title": "更新後タイトル",
    "content": "更新後内容",
    "authorId": "作成者ID",
    "authorName": "作成者名",
    "authorEmail": "作成者メール",
    "authorImage": "作成者画像URL",
    "likes": ["ユーザーID1"],
    "likesCount": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

**エラー**:
- `401`: 認証が必要
- `403`: 他のユーザーの投稿は編集不可
- `404`: 投稿が見つからない
- `400`: バリデーションエラー
- `500`: サーバーエラー

#### 2.5 投稿削除 🔒
```
DELETE /api/posts/[id]
```

**説明**: 自分の投稿を削除します（認証必須、投稿者のみ）。

**レスポンス**:
```json
{
  "success": true,
  "data": {}
}
```

**エラー**:
- `401`: 認証が必要
- `403`: 他のユーザーの投稿は削除不可
- `404`: 投稿が見つからない
- `500`: サーバーエラー

#### 2.6 いいね機能 🔒
```
POST /api/posts/[id]/like
```

**説明**: 投稿にいいねを追加/削除します（認証必須）。

**レスポンス**:
```json
{
  "success": true,
  "liked": true,
  "likesCount": 5,
  "message": "いいねしました"
}
```

**liked**: `true`の場合はいいね追加、`false`の場合はいいね削除

**エラー**:
- `401`: 認証が必要
- `404`: 投稿が見つからない
- `500`: サーバーエラー

### 3. ユーザー関連 API

#### 3.1 ユーザー詳細取得
```
GET /api/users/[userId]
```

**説明**: 指定されたIDのユーザー情報を取得します。

**レスポンス**:
```json
{
  "data": {
    "id": "ユーザーID",
    "name": "ユーザー名",
    "email": "user@example.com",
    "bio": "自己紹介",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**エラー**:
- `404`: ユーザーが見つからない
- `500`: サーバーエラー

### 4. プロフィール関連 API

#### 4.1 プロフィール取得 🔒
```
GET /api/profile
```

**説明**: 現在ログイン中のユーザーのプロフィールを取得します。

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "id": "ユーザーID",
    "email": "user@example.com",
    "name": "ユーザー名",
    "bio": "自己紹介",
    "emailVerified": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**エラー**:
- `401`: 認証が必要
- `404`: ユーザーが見つからない
- `500`: サーバーエラー

#### 4.2 プロフィール更新 🔒
```
PUT /api/profile
```

**説明**: 現在ログイン中のユーザーのプロフィールを更新します。

**リクエストボディ**:
```json
{
  "name": "新しい名前",
  "bio": "新しい自己紹介"
}
```

**バリデーション**:
- name: 必須、50文字以内
- bio: 任意、200文字以内

**レスポンス**:
```json
{
  "success": true,
  "message": "プロフィールを更新しました",
  "data": {
    "id": "ユーザーID",
    "email": "user@example.com",
    "name": "新しい名前",
    "bio": "新しい自己紹介"
  }
}
```

**エラー**:
- `401`: 認証が必要
- `400`: バリデーションエラー
- `404`: ユーザーが見つからない
- `500`: サーバーエラー

## エラーコードとメッセージ

### HTTPステータスコード

| ステータスコード | 説明 |
|---|---|
| 200 | リクエスト成功 |
| 201 | 作成成功 |
| 400 | 不正なリクエスト（バリデーションエラー等） |
| 401 | 認証が必要 |
| 403 | 権限不足 |
| 404 | リソースが見つからない |
| 500 | サーバー内部エラー |

### エラーレスポンス形式

```json
{
  "error": "エラーメッセージ"
}
```

### 一般的なエラーメッセージ

| エラーメッセージ | 説明 |
|---|---|
| "ログインが必要です" | 認証が必要なエンドポイントで未認証 |
| "投稿が見つかりません" | 指定された投稿が存在しない |
| "ユーザーが見つかりません" | 指定されたユーザーが存在しない |
| "他のユーザーの投稿は編集/削除できません" | 権限不足 |
| "タイトルを入力してください" | 必須フィールドが空 |
| "タイトルは100文字以内で入力してください" | 文字数制限超過 |

## レート制限

現在、明示的なレート制限は実装されていませんが、以下の方針を推奨します：

- 同一IPからのリクエスト: 100リクエスト/分
- 認証済みユーザー: 1000リクエスト/時間
- 投稿作成: 10投稿/分

## セキュリティ対策

### 1. 入力値サニタイゼーション
- すべてのユーザー入力はDOMPurifyを使用してサニタイズ
- HTMLタグの除去、XSS攻撃の防止
- MongoDBクエリインジェクション対策

### 2. 認証・認可
- NextAuth.jsを使用したセキュアな認証
- JWTトークンによるセッション管理
- メールアドレス確認必須

### 3. パスワードセキュリティ
- bcryptを使用したパスワードハッシュ化
- パスワード最小長: 8文字
- パスワードリセット機能（1時間で期限切れ）

### 4. データベースセキュリティ
- MongoDBへの直接アクセス防止
- 機密情報（パスワード、トークン）の適切な除外
- インデックスの最適化

### 5. その他のセキュリティ機能
- ファイル名のサニタイゼーション
- URLの検証（危険なプロトコルの防止）
- JSONレスポンスのサニタイゼーション

## サンプルリクエスト/レスポンス

### 投稿作成の例

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "title": "こんにちは",
    "content": "初めての投稿です。よろしくお願いします！"
  }'
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "_id": "65f123456789abcdef123456",
    "title": "こんにちは",
    "content": "初めての投稿です。よろしくお願いします！",
    "authorId": "65f123456789abcdef123457",
    "authorName": "田中太郎",
    "authorEmail": "tanaka@example.com",
    "authorImage": null,
    "likes": [],
    "likesCount": 0,
    "createdAt": "2024-03-13T10:30:00.000Z",
    "updatedAt": "2024-03-13T10:30:00.000Z"
  }
}
```

### いいね機能の例

**リクエスト**:
```bash
curl -X POST http://localhost:3000/api/posts/65f123456789abcdef123456/like \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

**レスポンス（いいね追加）**:
```json
{
  "success": true,
  "liked": true,
  "likesCount": 1,
  "message": "いいねしました"
}
```

**レスポンス（いいね削除）**:
```json
{
  "success": true,
  "liked": false,
  "likesCount": 0,
  "message": "いいねを取り消しました"
}
```

## データモデル

### Post（投稿）
```typescript
{
  _id: ObjectId,
  title: string,              // 最大100文字
  content: string,            // 最大1000文字
  authorId: string,           // 作成者のユーザーID
  authorName: string,         // 作成者の名前
  authorEmail: string,        // 作成者のメールアドレス
  authorImage: string | null, // 作成者のプロフィール画像URL
  likes: string[],            // いいねしたユーザーのIDリスト
  likesCount: number,         // いいねの総数
  createdAt: Date,            // 作成日時
  updatedAt: Date             // 更新日時
}
```

### User（ユーザー）
```typescript
{
  _id: ObjectId,
  email: string,              // 一意、小文字変換
  password: string,           // bcryptでハッシュ化
  name: string,               // 最大50文字
  bio: string,                // 最大200文字、任意
  emailVerified: Date | null, // メール確認日時
  verificationToken: string | null,     // メール確認トークン
  resetPasswordToken: string | null,    // パスワードリセットトークン
  resetPasswordExpires: Date | null,    // リセットトークン有効期限
  createdAt: Date,            // 作成日時
  updatedAt: Date             // 更新日時
}
```

## 開発者向け情報

### 環境変数
以下の環境変数が必要です：

```env
MONGODB_URI=mongodb://localhost:27017/myboardapp
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### デバッグ
開発環境では、NextAuth.jsのデバッグモードが有効になっています。

### テスト
```bash
npm test          # 単体テスト
npm run test:e2e  # E2Eテスト
```

## 変更履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 1.0.0 | 2024-03-13 | 初版作成 |

---

**注意**: このAPIは開発中のため、仕様が変更される可能性があります。本番環境での使用前には、セキュリティレビューを必ず実施してください。
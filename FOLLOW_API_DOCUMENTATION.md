# フォロー機能API仕様書

## 概要
Next.js 15とMongoDBを使用したSNSフォロー機能のAPI実装です。
すべてのエンドポイントは認証が必要です。

## 実装済みファイル

### モデル
- `/models/Follow.ts` - フォロー関係を管理するモデル
- `/models/User.ts` - ユーザーモデル（フォロー機能を追加）

### API エンドポイント
- `/app/api/follows/[userId]/route.ts` - フォロー/アンフォロー、状態確認
- `/app/api/users/[userId]/followers/route.ts` - フォロワー一覧取得
- `/app/api/users/[userId]/following/route.ts` - フォロー中一覧取得

### 認証ミドルウェア
- `/lib/authMiddleware.ts` - 認証チェック用ミドルウェア

## APIエンドポイント詳細

### 1. フォロー/アンフォロー

**エンドポイント**: `POST /api/follows/[userId]`

**リクエストボディ**:
```json
{
  "action": "follow" | "unfollow"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "Successfully followed user",
  "following": true,
  "followersCount": 150,
  "followingCount": 89
}
```

**エラーレスポンス**:
- 401: 未認証
- 400: 自分自身をフォロー、既にフォロー済み、フォローしていない
- 404: ユーザーが存在しない
- 500: サーバーエラー

### 2. フォロー状態確認

**エンドポイント**: `GET /api/follows/[userId]`

**レスポンス**:
```json
{
  "user": {
    "id": "userId",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "bio": "Software Developer",
    "followersCount": 150,
    "followingCount": 89
  },
  "following": true,
  "followedBy": false,
  "isMutual": false
}
```

### 3. フォロワー一覧取得

**エンドポイント**: `GET /api/users/[userId]/followers`

**クエリパラメータ**:
- `page` (optional): ページ番号（デフォルト: 1）
- `limit` (optional): 1ページあたりの件数（デフォルト: 20）

**レスポンス**:
```json
{
  "followers": [
    {
      "id": "followerId",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "avatar": "https://...",
      "bio": "Designer",
      "followersCount": 200,
      "followingCount": 150,
      "isFollowing": true,
      "followedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

### 4. フォロー中一覧取得

**エンドポイント**: `GET /api/users/[userId]/following`

**クエリパラメータ**:
- `page` (optional): ページ番号（デフォルト: 1）
- `limit` (optional): 1ページあたりの件数（デフォルト: 20）

**レスポンス**:
```json
{
  "following": [
    {
      "id": "userId",
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "avatar": "https://...",
      "bio": "Developer",
      "followersCount": 500,
      "followingCount": 250,
      "isFollowing": true,
      "isMutual": true,
      "followedAt": "2024-01-10T08:00:00Z"
    }
  ],
  "total": 89,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

## データベーススキーマ

### Follow Collection
```typescript
{
  followerId: string;      // フォローする人のID
  followingId: string;     // フォローされる人のID
  status: 'pending' | 'accepted';  // ステータス（デフォルト: accepted）
  createdAt: Date;
  updatedAt: Date;
}
```

### User Collection（追加フィールド）
```typescript
{
  avatar?: string;         // アバター画像URL
  followers: string[];     // フォロワーのユーザーID配列
  following: string[];     // フォロー中のユーザーID配列
  followersCount: number;  // フォロワー数（キャッシュ）
  followingCount: number;  // フォロー数（キャッシュ）
}
```

## セキュリティ考慮事項

1. **認証必須**: すべてのエンドポイントで認証チェックを実施
2. **自己フォロー防止**: 自分自身をフォローできないように制御
3. **重複フォロー防止**: データベースレベルでユニーク制約を設定
4. **レート制限**: 本番環境では適切なレート制限の実装を推奨
5. **入力検証**: ユーザーIDの形式チェック

## 使用例

### フォローする
```javascript
const response = await fetch('/api/follows/targetUserId', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    action: 'follow'
  })
});

const data = await response.json();
console.log(data.following); // true
```

### フォロワー一覧を取得
```javascript
const response = await fetch('/api/users/userId/followers?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const data = await response.json();
console.log(data.followers); // フォロワーの配列
```

## パフォーマンス最適化

1. **インデックス**: 高速検索のために複合インデックスを設定
2. **カウントキャッシュ**: フォロワー数とフォロー数をUserモデルにキャッシュ
3. **ページネーション**: 大量のフォロワー/フォロー中リストに対応
4. **選択的フィールド取得**: 必要なフィールドのみを取得してパフォーマンスを向上

## 今後の拡張予定

1. **プライベートアカウント**: pendingステータスを活用したフォローリクエスト機能
2. **ブロック機能**: ユーザーのブロック/ブロック解除
3. **フォロー推薦**: おすすめユーザーの提案
4. **通知連携**: フォロー時の通知送信
5. **一括操作**: 複数ユーザーの一括フォロー/アンフォロー
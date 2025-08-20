# Follow API テストガイド

## 🚀 クイックスタート

### 1. ブラウザでテスト（推奨）

```
http://localhost:3000/test/follow
```

ログイン後、このページで全機能をGUIでテスト可能

### 2. cURLコマンドでテスト

#### 準備: セッショントークンの取得

1. ブラウザでログイン
2. DevTools (F12) → Application → Cookies
3. `next-auth.session-token`の値をコピー

#### 基本的なテストコマンド

```bash
# 環境変数設定
export SESSION="your-session-token-here"
export USER_ID="target-user-id-here"
export BASE_URL="http://localhost:3000/api/sns"

# 1. フォロー統計を取得（認証不要）
curl -X GET "$BASE_URL/follow/$USER_ID" | json_pp

# 2. ユーザーをフォロー（認証必要）
curl -X POST "$BASE_URL/follow/$USER_ID" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp

# 3. フォロー解除
curl -X DELETE "$BASE_URL/follow/$USER_ID" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp

# 4. フォロワー一覧取得
curl -X GET "$BASE_URL/followers/$USER_ID?page=1&limit=10" | json_pp

# 5. フォロー中一覧取得
curl -X GET "$BASE_URL/following/$USER_ID?page=1&limit=10" | json_pp
```

## 🧪 エラーケースのテスト

### 自己フォロー（エラー400）
```bash
# 自分のIDを使用
curl -X POST "$BASE_URL/follow/YOUR_OWN_ID" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp
```

### 重複フォロー（エラー409）
```bash
# 同じコマンドを2回実行
curl -X POST "$BASE_URL/follow/$USER_ID" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp

curl -X POST "$BASE_URL/follow/$USER_ID" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp
```

### 存在しないユーザー（エラー404）
```bash
curl -X POST "$BASE_URL/follow/invalid-user-id" \
  -H "Cookie: next-auth.session-token=$SESSION" | json_pp
```

### 認証なし（エラー401）
```bash
curl -X POST "$BASE_URL/follow/$USER_ID" | json_pp
```

## 📊 レスポンス例

### 成功時
```json
{
  "success": true,
  "message": "Successfully followed user",
  "data": {
    "follower": "user-a-id",
    "following": "user-b-id",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### エラー時
```json
{
  "error": "Already following this user"
}
```

### フォロー統計
```json
{
  "followersCount": 10,
  "followingCount": 5,
  "isFollowing": true,
  "isFollowedBy": false,
  "isMutual": false
}
```

## 🔧 トラブルシューティング

### 401 Unauthorized
- セッショントークンが正しいか確認
- ログイン状態を確認

### 404 Not Found
- ユーザーIDが正しいか確認
- MongoDBでユーザーの存在を確認

### 500 Internal Server Error
- MongoDBの接続を確認
- サーバーログを確認

## 💡 Tips

1. **Postmanを使う場合**
   - Cookieヘッダーに`next-auth.session-token=xxx`を設定
   - Content-Typeは`application/json`

2. **HTTPieを使う場合**
   ```bash
   http POST localhost:3000/api/sns/follow/$USER_ID \
     Cookie:next-auth.session-token=$SESSION
   ```

3. **テストユーザーの作成**
   ```bash
   node scripts/test-follow.mjs
   ```
   これで3つのテストユーザーが作成されます
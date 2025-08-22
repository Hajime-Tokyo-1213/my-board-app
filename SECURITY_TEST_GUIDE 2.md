# セキュリティテストガイド

## 事前準備

### 必要なツール
- Node.js環境
- curlコマンド
- ブラウザの開発者ツール
- Postman（オプション）

### テスト用アカウント
```
メール: security-test@example.com
パスワード: SecurePass123!
```

### 開発サーバーの起動
```bash
npm run dev
```

---

## 1. レート制限のテスト

### 1.1 認証APIのレート制限（1分間に5回）

**テスト手順:**
```bash
# scripts/test-rate-limit.jsを実行
node scripts/test-rate-limit.js auth
```

**手動テスト:**
1. ログインページで間違ったパスワードを6回連続で入力
2. 6回目でエラーメッセージが変わることを確認

**期待される結果:**
- ✅ 5回まで: 通常のエラーメッセージ
- ✅ 6回目以降: "レート制限に達しました"というエラー
- ✅ レスポンスヘッダーに以下が含まれる:
  - `X-RateLimit-Limit: 5`
  - `X-RateLimit-Remaining: 0`
  - `Retry-After: [秒数]`

### 1.2 投稿作成のレート制限（1分間に5投稿）

**テスト手順:**
```bash
# scripts/test-rate-limit.jsを実行
node scripts/test-rate-limit.js create-post
```

**期待される結果:**
- ✅ 5投稿まで: 正常に作成
- ✅ 6投稿目: 429 Too Many Requestsエラー
- ✅ 1分後にリセットされる

### 1.3 いいね機能のレート制限（1分間に30回）

**テスト手順:**
```bash
# scripts/test-rate-limit.jsを実行
node scripts/test-rate-limit.js like
```

---

## 2. XSS攻撃のシミュレーション

### 2.1 基本的なXSS攻撃パターン

**テストケース一覧:**
```javascript
const xssTestCases = [
  // スクリプトインジェクション
  "<script>alert('XSS')</script>",
  "<script>document.cookie</script>",
  
  // イベントハンドラー
  "<img src=x onerror=alert('XSS')>",
  "<body onload=alert('XSS')>",
  
  // HTMLインジェクション
  "<iframe src='javascript:alert(1)'></iframe>",
  "<a href='javascript:void(0)'>Click</a>",
  
  // スタイルインジェクション
  "<style>body{display:none}</style>",
  
  // データURL
  "<img src='data:text/html,<script>alert(1)</script>'>",
];
```

**テスト手順:**
1. 各パターンを投稿のタイトルと本文に入力
2. 投稿を作成
3. 投稿一覧と詳細ページで表示を確認

**期待される結果:**
- ✅ スクリプトが実行されない
- ✅ HTMLタグが無害化される（エスケープまたは削除）
- ✅ プレーンテキストとして表示される

### 2.2 XSSペイロードの自動テスト

```bash
# XSSテストスクリプトを実行
node scripts/test-xss.js
```

---

## 3. セキュリティヘッダーの確認

### 3.1 ブラウザでの確認方法

**手順:**
1. Chrome/Firefoxの開発者ツールを開く（F12）
2. Networkタブを選択
3. ページをリロード
4. 任意のリクエストをクリック
5. Response Headersを確認

### 3.2 curlでの確認方法

```bash
# セキュリティヘッダーを確認
curl -I http://localhost:3000

# 期待されるヘッダー
curl -I http://localhost:3000 | grep -E "Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Permissions-Policy"
```

### 3.3 自動チェックスクリプト

```bash
# セキュリティヘッダーの自動チェック
node scripts/test-security-headers.js
```

**チェックポイント:**
- ✅ Content-Security-Policy が設定されている
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ Permissions-Policy でカメラ・マイク・位置情報が無効

---

## 4. CSRF対策の確認

### 4.1 CSRFトークンの確認

**手順:**
1. ログインページを開く
2. 開発者ツールでHTML内のCSRFトークンを確認
3. Cookieに`next-auth.csrf-token`が設定されていることを確認

### 4.2 CSRF攻撃のシミュレーション

```html
<!-- 悪意のあるサイトからのPOSTリクエスト -->
<form action="http://localhost:3000/api/posts" method="POST">
  <input type="hidden" name="title" value="CSRF Attack">
  <input type="hidden" name="content" value="This is CSRF">
</form>
<script>document.forms[0].submit();</script>
```

**期待される結果:**
- ✅ リクエストが拒否される
- ✅ 401または403エラーが返される

---

## 5. 不正な入力値のテスト

### 5.1 SQLインジェクション風の入力

**テストケース:**
```javascript
const injectionTests = [
  "'; DROP TABLE posts; --",
  "1' OR '1'='1",
  "${7*7}",  // テンプレートインジェクション
  "{{7*7}}",  // テンプレートインジェクション
  "../../../etc/passwd",  // パストラバーサル
];
```

### 5.2 特殊文字のテスト

**テストケース:**
```javascript
const specialChars = [
  "NULL",
  "\x00",  // Null文字
  "🔥💀🎃",  // 絵文字
  "᠎᠎᠎",  // ゼロ幅文字
  String.fromCharCode(8203),  // ゼロ幅スペース
];
```

### 5.3 文字数制限の境界値テスト

```bash
# 境界値テストスクリプト
node scripts/test-validation.js
```

---

## 6. 監査ログの確認（未実装）

### 6.1 ログ記録のテスト項目

将来的に実装される監査ログで確認すべき項目:

1. **認証イベント**
   - ログイン成功/失敗
   - ログアウト
   - パスワードリセット

2. **CRUD操作**
   - 投稿の作成/更新/削除
   - いいねの追加/削除

3. **セキュリティイベント**
   - レート制限の発動
   - XSS攻撃の検出
   - 不正なアクセス試行

---

## テスト実行スクリプト

### 全テストの一括実行

```bash
# すべてのセキュリティテストを実行
npm run test:security
```

### 個別テストの実行

```bash
# レート制限のテスト
npm run test:rate-limit

# XSSテスト
npm run test:xss

# ヘッダーチェック
npm run test:headers

# バリデーションテスト
npm run test:validation
```

---

## テスト結果のチェックリスト

### Phase 1（実装済み）
- [ ] レート制限が正しく動作する
- [ ] XSS攻撃が防御される
- [ ] セキュリティヘッダーが設定されている
- [ ] 不正な入力値が適切にサニタイズされる

### Phase 2（今後実装予定）
- [ ] CSRFトークンが正しく検証される
- [ ] セッションタイムアウトが動作する
- [ ] 同時セッション数の制限が機能する

### Phase 3（今後実装予定）
- [ ] 監査ログが記録される
- [ ] アラートが適切に発動する
- [ ] インシデント対応フローが機能する

---

## トラブルシューティング

### レート制限が効かない場合
1. LRU Cacheが正しくインストールされているか確認
2. middleware.tsが正しく設定されているか確認
3. IPアドレスの取得が正しいか確認

### XSSが防げない場合
1. DOMPurifyが正しくインストールされているか確認
2. サニタイザー関数が呼ばれているか確認
3. フロントエンドでのエスケープ処理を確認

### セキュリティヘッダーが表示されない場合
1. middleware.tsのsetSecurityHeaders関数を確認
2. Next.jsの設定を確認
3. ブラウザのキャッシュをクリア

---

## セキュリティレポートの作成

テスト完了後、以下の項目を含むレポートを作成:

1. **テスト実施日時**
2. **テスト環境**
3. **テスト結果サマリー**
4. **発見された問題と対策**
5. **改善提案**
6. **次回テスト予定**
# Vercelへのデプロイメント

## 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定してください：

### 必須の環境変数

```
# MongoDB接続
MONGODB_URI=mongodb+srv://boarduser:xxxxx@cluster0.ogfrxno.mongodb.net/boardDB?retryWrites=true&w=majority&appName=Cluster0

# NextAuth設定
NEXTAUTH_URL=https://your-app-name.vercel.app  # あなたのVercel URLに変更
NEXTAUTH_SECRET=（強力なランダム文字列 - openssl rand -base64 32 で生成）

# SMTP設定（メール送信用）
SMTP_HOST=teqham.sakura.ne.jp
SMTP_PORT=587
SMTP_USER=noreply@teqham.com
SMTP_PASS=（SMTPパスワード）
EMAIL_FROM=noreply@teqham.com
```

## 設定手順

1. [Vercel](https://vercel.com)にログイン
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 左メニューの「Environment Variables」を選択
5. 上記の環境変数を追加
6. 「Save」をクリック

## デプロイ

環境変数設定後、以下のいずれかの方法でデプロイ：

### 方法1: 自動デプロイ（推奨）
```bash
git push origin main
```

### 方法2: 手動デプロイ
```bash
vercel --prod
```

## 動作確認

1. 新規登録機能
   - メール送信が正常に動作すること
   - 確認メールが届くこと

2. ログイン機能
   - メール確認済みのアカウントでログインできること

3. 投稿機能
   - ログイン後、投稿の作成・編集・削除ができること

## トラブルシューティング

### メールが届かない場合
1. SMTP設定を確認
2. スパムフォルダを確認
3. Vercelのログでエラーを確認（Functions タブ）

### データベース接続エラー
1. MONGODB_URIが正しいか確認
2. MongoDBのIPホワイトリスト設定を確認（0.0.0.0/0を許可）

### 認証エラー
1. NEXTAUTH_URLが正しいVercel URLになっているか確認
2. NEXTAUTH_SECRETが設定されているか確認
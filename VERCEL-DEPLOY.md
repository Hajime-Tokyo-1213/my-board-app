# Vercelデプロイガイド

## エラーの解決方法

### 問題
Vercelビルド時に以下のエラーが発生：
```
Error: Please define the MONGODB_URI environment variable inside .env.local
```

### 原因
Vercelの本番環境に`MONGODB_URI`環境変数が設定されていない

## 解決手順

### 1. MongoDB Atlasの準備
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) にアクセス
2. 無料アカウントを作成
3. クラスターを作成（M0 Free Tierで十分）
4. Database Accessでユーザーを作成
5. Network Accessで`0.0.0.0/0`を追加（すべてのIPを許可）
6. 接続文字列を取得

### 2. Vercelで環境変数を設定

#### 方法1: Vercel Dashboard（推奨）
1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクトを選択
3. 「Settings」タブをクリック
4. 「Environment Variables」セクションに移動
5. 以下を追加：
   - **Key**: `MONGODB_URI`
   - **Value**: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
   - **Environment**: Production, Preview, Development（すべて選択）
6. 「Save」をクリック

#### 方法2: Vercel CLI
```bash
vercel env add MONGODB_URI production
# プロンプトでMongoDB接続文字列を入力
```

### 3. 再デプロイ
```bash
# 方法1: Git push
git add .
git commit -m "fix: Vercel環境変数設定を追加"
git push origin main

# 方法2: Vercel CLI
vercel --prod
```

## その他の推奨設定

### 環境変数の追加（オプション）
```
# Vercel Dashboardで以下も追加可能
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
```

### セキュリティ設定
1. MongoDB AtlasのNetwork Accessで本番環境のIPのみ許可
2. Database Accessで権限を最小限に設定
3. 環境変数を暗号化（Vercelは自動的に暗号化）

## トラブルシューティング

### ビルドが失敗する場合
1. ログを確認：Vercel Dashboard > Functions > Logs
2. 環境変数が正しく設定されているか確認
3. MongoDB接続文字列の形式を確認

### 接続タイムアウトの場合
1. MongoDB AtlasのNetwork Accessを確認
2. クラスターがアクティブか確認
3. 接続文字列のデータベース名を確認

### ローカルでテスト
```bash
# .env.localファイルを作成
echo "MONGODB_URI=your-connection-string" > .env.local

# ビルドテスト
npm run build
npm run start
```

## 完了後の確認

1. Vercel Dashboardでビルドステータスが「Ready」になることを確認
2. デプロイされたURLにアクセス
3. 投稿の作成・表示・編集・削除が動作することを確認

## 参考リンク
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [MongoDB Atlas Setup](https://www.mongodb.com/docs/atlas/getting-started/)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
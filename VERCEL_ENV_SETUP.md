# Vercel環境変数設定ガイド

## 必要な環境変数

以下の環境変数をVercelのプロジェクト設定に追加してください：

### 1. Cloudinary設定（重要：画像アップロードと表示に必須）
```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=du1egut5n
CLOUDINARY_CLOUD_NAME=du1egut5n
CLOUDINARY_API_KEY=111937158928995
CLOUDINARY_API_SECRET=hCl0AS4Y5sI1peRgtog4xBlZOBk
```

**重要**: これらの環境変数がないと画像のアップロードと表示が動作しません。

### 2. MongoDB設定
```
MONGODB_URI=mongodb+srv://boarduser:1Ff5tbNVeevxmBhE@cluster0.ogfrxno.mongodb.net/boardDB?retryWrites=true&w=majority&appName=Cluster0
```

### 3. NextAuth設定
```
NEXTAUTH_URL=https://app.teqham.com
NEXTAUTH_SECRET=l5RDPsj/CH2fjt/H7UhLI9UcuUofPWx/75CfbyX4Xj8=
```

### 4. SMTP設定
```
SMTP_HOST=teqham.sakura.ne.jp
SMTP_PORT=587
SMTP_USER=noreply@teqham.com
SMTP_PASS=6Beimwsa@pgDbY5
EMAIL_FROM=noreply@teqham.com
```

### 5. SNS機能設定
```
SNS_FEATURES_ENABLED=true
MAX_POST_LENGTH=500
MAX_COMMENT_LENGTH=200
POSTS_PER_PAGE=20
IMAGE_UPLOAD_MAX_SIZE=5242880
```

### 6. PWA Push Notification設定
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOCS6JJNccZkXBCwEYnLaKOEp1K6Db1Get80uXs0Hk14t6GRwA1vGfHP-g-SU4R0qBghTRkS3-hRnwLJ9ikkW54
VAPID_PRIVATE_KEY=DebzeiB3Mi2_CBFRRTUj6cW0ROnJTJgR73trAVwm384
```

## 設定方法

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. 対象のプロジェクトを選択
3. Settings → Environment Variablesタブを開く
4. 上記の環境変数を追加
5. 保存後、再デプロイを実行

## 重要な注意事項

- `NEXT_PUBLIC_`プレフィックスがついた環境変数はクライアントサイドで使用されます
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`は画像表示に必須です
- すべてのCloudinary関連の環境変数は画像機能に必須です
- 環境変数を追加・変更した後は必ず再デプロイが必要です

## デバッグ方法

環境変数が正しく設定されているか確認するには：
1. https://app.teqham.com/api/debug/cloudinary にアクセス
2. 各環境変数が "Set" になっているか確認
3. 問題がある場合は、Vercelダッシュボードで環境変数を再確認
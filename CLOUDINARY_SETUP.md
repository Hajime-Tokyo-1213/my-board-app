# Cloudinary セットアップガイド

## 1. Cloudinaryアカウントの作成

1. [Cloudinary](https://cloudinary.com/)にアクセス
2. 「Sign Up for Free」をクリック
3. アカウント情報を入力して登録

## 2. 認証情報の取得

1. ダッシュボードにログイン
2. 以下の情報をコピー：
   - **Cloud Name**: あなたのクラウド名
   - **API Key**: APIキー
   - **API Secret**: APIシークレット

## 3. 環境変数の設定

`.env.local`ファイルに以下を追加：

```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 4. アップロードプリセットの作成（オプション）

より細かい制御が必要な場合：

1. Cloudinaryダッシュボード → Settings → Upload
2. 「Add upload preset」をクリック
3. 以下の設定を行う：
   - **Preset name**: `board-app-preset`
   - **Signing mode**: Signed
   - **Folder**: `board-app`
   - **Allowed formats**: jpg, jpeg, png, webp
   - **Max file size**: 10485760 (10MB)

## 5. 変換設定

自動的に以下の変換が適用されます：

- **サムネイル**: 300x300px (fill)
- **中サイズ**: 800x800px (limit)
- **大サイズ**: 1920x1920px (limit)

## 6. セキュリティ設定

1. Settings → Security
2. 以下を有効化：
   - Restrict image/video delivery to signed URLs
   - Enable automatic image moderation (オプション)

## 7. 使用量の確認

- 無料プランの制限：
  - 25 Credits/月
  - 25GB ストレージ
  - 25GB 帯域幅

## トラブルシューティング

### アップロードが失敗する場合

1. API認証情報が正しいか確認
2. Cloudinaryのダッシュボードでエラーログを確認
3. ネットワーク接続を確認

### 画像が表示されない場合

1. URLが正しく生成されているか確認
2. Cloudinaryの使用量制限に達していないか確認
3. ブラウザのコンソールでエラーを確認

## テスト用画像

以下のような画像でテスト：
- JPEG: 風景写真
- PNG: ロゴやアイコン
- WebP: 最適化された写真
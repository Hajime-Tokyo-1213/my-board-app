# 画像アップロード機能設計書

## 概要
投稿に画像を添付できる機能を実装します。Cloudinaryを使用してクラウドストレージと画像処理を行います。

## 技術スタック
- **フロントエンド**: Next.js 15、React Dropzone、Material UI
- **バックエンド**: Next.js API Routes
- **画像処理**: Cloudinary
- **データベース**: MongoDB
- **セキュリティ**: ファイル検証、ウイルススキャン

## アーキテクチャ

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js    │────▶│ Cloudinary  │
│   (React)   │     │  API Route  │     │   Storage   │
└─────────────┘     └─────────────┘     └─────────────┘
                            │
                            ▼
                    ┌─────────────┐
                    │   MongoDB   │
                    │  (メタデータ) │
                    └─────────────┘
```

## データモデル

### 1. Image Schema (MongoDB)
```typescript
interface IImage {
  _id: ObjectId;
  publicId: string;        // Cloudinary public ID
  url: string;             // 元画像URL
  thumbnailUrl: string;    // サムネイルURL (300x300)
  mediumUrl: string;       // 中サイズURL (800x800)
  largeUrl: string;        // 大サイズURL (1920x1920)
  format: string;          // 画像形式
  width: number;           // 元画像の幅
  height: number;          // 元画像の高さ
  size: number;            // ファイルサイズ（バイト）
  uploadedBy: ObjectId;    // アップロードユーザー
  postId?: ObjectId;       // 関連する投稿ID
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Post Schema 更新
```typescript
interface IPost {
  // 既存のフィールド...
  images?: string[];       // 画像URLの配列（最大4枚）
  imageIds?: ObjectId[];   // Image IDの配列
}
```

## API設計

### 1. 画像アップロード
**POST** `/api/images/upload`
```typescript
// Request (FormData)
{
  file: File;              // アップロードファイル
  postId?: string;         // 関連する投稿ID（オプション）
}

// Response
{
  success: boolean;
  image: {
    id: string;
    url: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
  };
}
```

### 2. 画像削除
**DELETE** `/api/images/[id]`
```typescript
// Response
{
  success: boolean;
  message: string;
}
```

### 3. 画像一覧取得
**GET** `/api/images?postId={postId}`
```typescript
// Response
{
  images: Image[];
  count: number;
}
```

## Cloudinary設定

### 1. アップロード設定
```javascript
const uploadOptions = {
  folder: 'board-app',
  allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  max_file_size: 10485760, // 10MB
  resource_type: 'auto',
  transformation: [
    { quality: 'auto:good' },
    { fetch_format: 'auto' }
  ]
};
```

### 2. 変換プリセット
```javascript
const transformations = {
  thumbnail: {
    width: 300,
    height: 300,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:low'
  },
  medium: {
    width: 800,
    height: 800,
    crop: 'limit',
    quality: 'auto:good'
  },
  large: {
    width: 1920,
    height: 1920,
    crop: 'limit',
    quality: 'auto:best'
  }
};
```

## フロントエンドコンポーネント

### 1. ImageUploader
```typescript
interface ImageUploaderProps {
  maxFiles?: number;        // 最大ファイル数（デフォルト: 4）
  maxSize?: number;         // 最大サイズ（デフォルト: 10MB）
  onUpload: (images: UploadedImage[]) => void;
  onError: (error: string) => void;
}
```

機能:
- ドラッグ&ドロップ対応
- ファイル選択ダイアログ
- プレビュー表示
- アップロード進捗表示
- エラーハンドリング

### 2. ImageGallery
```typescript
interface ImageGalleryProps {
  images: string[];
  onDelete?: (index: number) => void;
  editable?: boolean;
}
```

機能:
- グリッド表示
- ライトボックス
- 削除機能（編集モード時）
- レスポンシブ対応

## セキュリティ対策

### 1. ファイル検証
- **形式チェック**: MIME typeとファイル拡張子の検証
- **サイズ制限**: 10MB以下
- **画像検証**: 実際の画像データかを検証
- **メタデータ削除**: EXIF情報等を削除

### 2. アップロード制限
- **レート制限**: 1分間に5回まで
- **認証必須**: ログインユーザーのみ
- **枚数制限**: 1投稿につき4枚まで
- **容量制限**: ユーザーごとの総容量制限

### 3. Cloudinaryセキュリティ
- **署名付きアップロード**: セキュアなアップロード
- **アクセス制御**: 認証トークンによる制御
- **自動モデレーション**: 不適切コンテンツの検出

## 実装フロー

### アップロードフロー
1. **クライアント側**
   - ファイル選択/ドロップ
   - クライアント側検証（形式、サイズ）
   - プレビュー表示
   - FormDataでアップロード

2. **サーバー側**
   - 認証確認
   - ファイル検証
   - Cloudinaryへアップロード
   - 変換画像の生成
   - MongoDBにメタデータ保存
   - レスポンス返却

3. **エラーハンドリング**
   - アップロード失敗時のリトライ
   - 部分的な失敗の処理
   - ユーザーへの通知

## パフォーマンス最適化

### 1. 画像最適化
- **自動フォーマット変換**: WebP対応ブラウザには自動変換
- **遅延読み込み**: Intersection Observerで必要時のみ読み込み
- **プログレッシブ画像**: 段階的な表示
- **CDN配信**: Cloudinary CDNを利用

### 2. アップロード最適化
- **チャンク分割**: 大きなファイルの分割アップロード
- **並列アップロード**: 複数ファイルの同時処理
- **再開可能アップロード**: 中断からの再開

## 環境変数
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_PRESET=board-app-preset
```

## テスト項目
1. **機能テスト**
   - 各形式のアップロード
   - サイズ制限の確認
   - 複数ファイルアップロード
   - ドラッグ&ドロップ

2. **セキュリティテスト**
   - 不正なファイル形式
   - サイズ超過
   - XSS攻撃
   - 認証なしアクセス

3. **パフォーマンステスト**
   - 大容量ファイル
   - 同時アップロード
   - ネットワーク遅延

## 今後の拡張案
1. **動画対応**: MP4、WebM形式のサポート
2. **画像編集**: クロップ、回転、フィルター
3. **AI機能**: 自動タグ付け、不適切コンテンツ検出
4. **外部連携**: InstagramやGoogle Photos連携
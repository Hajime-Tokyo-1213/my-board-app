# 画像アップロード機能テストガイド

## テスト構成

### 1. ユニットテスト

#### imageProcessor.test.ts
画像処理ユーティリティのテスト
```bash
npm test __tests__/utils/imageProcessor.test.ts
```

**テスト項目：**
- ✅ ファイル形式の検証（JPEG、PNG、WebP）
- ✅ ファイルサイズ制限（10MB）
- ✅ 複数ファイルの検証（最大4枚）
- ✅ Magic numberチェック
- ✅ ファイル名のサニタイズ
- ✅ 画像寸法の取得
- ✅ CloudinaryURL生成
- ✅ アスペクト比の計算

#### upload.test.ts
アップロードAPIのテスト
```bash
npm test __tests__/api/upload.test.ts
```

**テスト項目：**
- ✅ 認証チェック
- ✅ ファイル検証
- ✅ アップロード成功・失敗
- ✅ Cloudinary連携
- ✅ MongoDB保存
- ✅ 削除権限チェック
- ✅ エラーハンドリング

#### ImageUploader.test.tsx
コンポーネントのテスト
```bash
npm test __tests__/components/ImageUploader.test.tsx
```

**テスト項目：**
- ✅ UIの表示
- ✅ ドラッグ&ドロップ状態
- ✅ 残り枚数表示
- ✅ アップロード処理
- ✅ 削除処理
- ✅ エラー表示
- ✅ プログレス表示

### 2. E2Eテスト

#### image-upload.spec.ts
```bash
npx playwright test e2e/image-upload.spec.ts
```

**テスト項目：**
- ✅ ドラッグ&ドロップ
- ✅ ファイル選択
- ✅ 複数ファイルアップロード
- ✅ 4枚制限
- ✅ 無効な形式の拒否
- ✅ サイズ制限
- ✅ 画像削除
- ✅ プログレス表示
- ✅ プレビュー表示
- ✅ ネットワークエラー

## テスト実行方法

### すべてのテストを実行
```bash
npm test
```

### 特定のテストファイルを実行
```bash
npm test -- imageProcessor.test.ts
```

### E2Eテストを実行
```bash
# ヘッドレスモード
npx playwright test

# UIモード
npx playwright test --ui

# デバッグモード
npx playwright test --debug
```

### カバレッジレポート
```bash
npm test -- --coverage
```

## テスト用ファイルの準備

### テスト画像の作成
`e2e/fixtures/`ディレクトリに以下のファイルを配置：

```bash
# テスト用画像を作成
mkdir -p e2e/fixtures

# JPEGファイル（通常サイズ）
convert -size 800x600 xc:blue e2e/fixtures/test-image.jpg
convert -size 800x600 xc:red e2e/fixtures/test-image1.jpg
convert -size 800x600 xc:green e2e/fixtures/test-image2.jpg
convert -size 800x600 xc:yellow e2e/fixtures/test-image3.jpg

# PNGファイル
convert -size 800x600 xc:purple e2e/fixtures/test-image.png

# WebPファイル
convert e2e/fixtures/test-image.jpg e2e/fixtures/test-image.webp

# GIFファイル（無効な形式のテスト用）
convert -size 800x600 xc:orange e2e/fixtures/test-image.gif

# 大きなファイル（11MB）
dd if=/dev/zero of=e2e/fixtures/large-image.jpg bs=1M count=11
```

## モックデータ

### Cloudinaryレスポンスのモック
```javascript
const mockCloudinaryResponse = {
  public_id: 'board-app/user123/test-image',
  secure_url: 'https://res.cloudinary.com/test/image.jpg',
  format: 'jpg',
  width: 1920,
  height: 1080,
  bytes: 204800,
};
```

### 画像データのモック
```javascript
const mockImage = {
  id: 'img123',
  url: 'https://example.com/image.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  mediumUrl: 'https://example.com/medium.jpg',
  largeUrl: 'https://example.com/large.jpg',
  width: 1920,
  height: 1080,
  format: 'jpg',
};
```

## トラブルシューティング

### テストが失敗する場合

1. **依存関係の確認**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test
```

2. **環境変数の設定**
```bash
# .env.test
CLOUDINARY_CLOUD_NAME=test-cloud
CLOUDINARY_API_KEY=test-key
CLOUDINARY_API_SECRET=test-secret
```

3. **モックの確認**
- `jest.setup.js`でグローバルモックが設定されているか
- `fetch`、`URL.createObjectURL`がモックされているか

### E2Eテストの問題

1. **Playwrightのインストール**
```bash
npx playwright install
```

2. **テストサーバーの起動**
```bash
npm run dev
# 別ターミナルで
npx playwright test
```

3. **デバッグ**
```bash
# スクリーンショットを有効化
npx playwright test --screenshot=on

# トレースを有効化
npx playwright test --trace=on
```

## CI/CD設定

### GitHub Actions
```yaml
name: Test Image Upload

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm test
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Run E2E tests
        run: npx playwright test
        
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## パフォーマンステスト

### アップロード速度の測定
```javascript
const startTime = performance.now();
await uploadFile(file);
const endTime = performance.now();
console.log(`Upload time: ${endTime - startTime}ms`);
```

### 同時アップロードのテスト
```javascript
const files = Array(4).fill(null).map(() => createTestFile());
const results = await Promise.all(files.map(uploadFile));
```
# パフォーマンステストガイド

## 概要
このガイドでは、実装したパフォーマンス最適化のテスト方法と測定方法を説明します。

## テスト種類

### 1. ユニットテスト

#### 画像最適化テスト
```bash
npm test __tests__/performance/image-optimization.test.tsx
```

**テスト内容：**
- 画像の遅延読み込み機能
- Intersection Observer の動作
- スケルトンローダーの表示
- エラーハンドリング
- Cloudinary URL 生成
- WebP/AVIF 変換

#### バンドル最適化テスト
```bash
npm test __tests__/performance/bundle-optimization.test.tsx
```

**テスト内容：**
- 動的インポート（dynamic import）
- コード分割の動作
- コンポーネントのプリロード
- チャンク最適化設定
- パフォーマンストラッキング

### 2. E2E パフォーマンステスト

```bash
npm run test:e2e e2e/performance.spec.ts
```

**テスト内容：**
- Core Web Vitals（LCP、FID、CLS、FCP、TTFB）
- 画像の遅延読み込み実動作
- コード分割の実動作
- キャッシュ戦略の検証
- レンダリングパフォーマンス

### 3. Lighthouse パフォーマンス測定

```bash
# Lighthouse 測定スクリプトの実行
node scripts/measure-performance.js
```

**測定項目：**
- Performance Score
- Core Web Vitals
- リソースサイズ
- メモリ使用量
- ネットワーク最適化

## パフォーマンス測定方法

### 方法1: Chrome DevTools を使用

1. **Performance タブ**
   - Chrome DevTools を開く（F12）
   - Performance タブを選択
   - Record ボタンをクリックしてページをリロード
   - Stop して結果を分析

2. **Lighthouse タブ**
   - Lighthouse タブを選択
   - "Generate report" をクリック
   - Performance カテゴリの結果を確認

3. **Network タブ**
   - Network タブで帯域制限を設定
   - Slow 3G / Fast 3G でテスト
   - リソースサイズとロード時間を確認

### 方法2: コマンドライン測定

```bash
# Lighthouse CI の実行
npm run lighthouse:ci

# カスタム測定スクリプト
node scripts/measure-performance.js

# Bundle サイズ分析
ANALYZE=true npm run build
```

### 方法3: Web Vitals 拡張機能

1. [Web Vitals Chrome 拡張機能](https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma)をインストール
2. サイトを開いて拡張機能アイコンをクリック
3. リアルタイムの Core Web Vitals を確認

## パフォーマンス目標値

### Core Web Vitals
| メトリクス | 良好 | 要改善 | 不良 |
|-----------|------|--------|------|
| LCP | < 2.5s | 2.5-4s | > 4s |
| FID | < 100ms | 100-300ms | > 300ms |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 |
| FCP | < 1.8s | 1.8-3s | > 3s |
| TTFB | < 800ms | 800-1800ms | > 1800ms |

### その他の指標
- **JavaScript バンドルサイズ**: < 200KB (gzip)
- **画像最適化率**: > 90% WebP/AVIF
- **キャッシュヒット率**: > 80%
- **初回ロード時間**: < 3秒（3G環境）

## テスト実行手順

### 1. 環境準備
```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

### 2. 全テストの実行
```bash
# ユニットテスト
npm test __tests__/performance/

# E2Eテスト
npm run test:e2e e2e/performance.spec.ts

# Lighthouse測定
node scripts/measure-performance.js
```

### 3. レポートの確認
```bash
# パフォーマンスレポートの確認
ls -la performance-reports/

# 最新レポートを開く
open performance-reports/report-*.md
```

## CI/CD 統合

### GitHub Actions での自動測定
```yaml
name: Performance Test

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *' # 毎日実行

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
      
      - name: Run Performance Tests
        run: |
          npm run start &
          sleep 10
          node scripts/measure-performance.js
      
      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-reports/
```

## トラブルシューティング

### 問題: テストが遅い
**解決策:**
```bash
# 並列実行を有効化
npm test -- --maxWorkers=4

# 特定のテストのみ実行
npm test -- --testNamePattern="画像の遅延読み込み"
```

### 問題: Lighthouse エラー
**解決策:**
```bash
# Chrome のヘッドレスモードを確認
google-chrome --version

# Puppeteer の再インストール
npm install puppeteer --save-dev
```

### 問題: メモリ不足
**解決策:**
```bash
# Node.js のメモリ制限を増やす
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

## ベストプラクティス

1. **定期的な測定**
   - 毎日自動測定を実行
   - PR ごとにパフォーマンステスト

2. **複数環境でのテスト**
   - デスクトップ/モバイル
   - 異なるネットワーク速度
   - 異なるデバイス性能

3. **継続的な改善**
   - パフォーマンス予算の設定
   - 劣化の早期発見
   - 改善の効果測定

4. **実ユーザーメトリクス**
   - Google Analytics の活用
   - Real User Monitoring (RUM)
   - エラートラッキング

## 参考リンク

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse Documentation](https://developers.google.com/web/tools/lighthouse)
- [Chrome DevTools Performance](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
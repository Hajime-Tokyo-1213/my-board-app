# PWA機能テストガイド

## 概要
PWA（Progressive Web App）機能の包括的なテストスイートとLighthouse監査ツールの使用方法

## テスト項目

### 1. Service Worker テスト
- ✅ Service Worker の登録確認
- ✅ キャッシュ戦略の動作確認
- ✅ オフライン時のフォールバック
- ✅ バックグラウンド同期
- ✅ Service Worker の更新チェック

### 2. オフライン機能テスト
- ✅ IndexedDB の動作確認
- ✅ 下書きの保存と取得
- ✅ ペンディング投稿のキュー管理
- ✅ オフライン→オンライン同期

### 3. プッシュ通知テスト
- ✅ 通知権限の取得
- ✅ Push購読の作成/削除
- ✅ 通知APIの動作確認
- ✅ Service Workerからの通知

### 4. インストール可能性テスト
- ✅ Web App Manifest の検証
- ✅ 必要なアイコンの存在確認
- ✅ メタタグの設定確認
- ✅ HTTPS環境の確認
- ✅ オフラインページの存在

## テストの実行方法

### 前提条件
```bash
# 必要なパッケージがインストールされていることを確認
npm install

# アプリケーションをビルド
npm run build

# 本番モードで起動
npm start
```

### PWAテストの実行

#### 1. 全PWAテストを実行
```bash
npm run test:pwa
```

#### 2. 特定のテストファイルを実行
```bash
# Service Workerテストのみ
npx playwright test __tests__/pwa/service-worker.test.ts

# オフライン機能テストのみ
npx playwright test __tests__/pwa/offline.test.ts

# プッシュ通知テストのみ
npx playwright test __tests__/pwa/push-notification.test.ts

# インストール可能性テストのみ
npx playwright test __tests__/pwa/installability.test.ts
```

#### 3. デバッグモードで実行
```bash
npx playwright test __tests__/pwa/ --debug
```

#### 4. UIモードで実行
```bash
npx playwright test __tests__/pwa/ --ui
```

## Lighthouse PWA監査

### 基本的な使用方法

#### 1. ローカル環境での監査
```bash
# デフォルト（localhost:3000）
npm run lighthouse

# カスタムURL
node scripts/lighthouse-pwa-audit.js https://your-app.com
```

#### 2. 監査結果の確認
実行後、以下のファイルが生成されます：
- `lighthouse-pwa-report.html` - ビジュアルレポート
- `lighthouse-pwa-report.json` - 詳細なJSONデータ

HTMLレポートをブラウザで開いて確認：
```bash
open lighthouse-pwa-report.html  # macOS
start lighthouse-pwa-report.html  # Windows
xdg-open lighthouse-pwa-report.html  # Linux
```

### Lighthouse CI（継続的インテグレーション）

#### 設定ファイル作成
`.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      startServerCommand: 'npm start',
      startServerReadyPattern: 'ready on',
    },
    assert: {
      assertions: {
        'categories:pwa': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'installable-manifest': 'error',
        'service-worker': 'error',
        'offline-start-url': 'error',
        'is-on-https': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### CI実行
```bash
# Lighthouse CIをインストール
npm install -g @lhci/cli

# 実行
npm run lighthouse:ci
```

## Chrome DevToolsでの手動確認

### 1. Application タブ
- **Manifest**: マニフェストの内容確認
- **Service Workers**: 登録状態、スコープ、ステータス
- **Cache Storage**: キャッシュされたリソース
- **IndexedDB**: オフラインデータの確認

### 2. Network タブ
- オフラインモードに切り替えて動作確認
- Service Workerによるリクエストの確認

### 3. Lighthouse タブ
- PWA、Performance、Best Practicesカテゴリを選択
- 「Generate report」をクリック

## PWAスコア向上のチェックリスト

### 必須項目
- [ ] HTTPS接続（localhost除く）
- [ ] 有効なWeb App Manifest
- [ ] Service Worker登録
- [ ] オフライン時のフォールバック
- [ ] 192x192と512x512のアイコン
- [ ] `start_url`が200レスポンスを返す

### 推奨項目
- [ ] マスカブルアイコン
- [ ] Apple Touch Icon
- [ ] スプラッシュスクリーン設定
- [ ] theme-colorメタタグ
- [ ] viewportメタタグ
- [ ] カスタムインストールプロンプト

## トラブルシューティング

### Service Workerが登録されない
```javascript
// コンソールで確認
navigator.serviceWorker.getRegistrations().then(regs => console.log(regs));
```

### キャッシュが更新されない
```javascript
// キャッシュをクリア
caches.keys().then(names => {
  names.forEach(name => caches.delete(name));
});
```

### プッシュ通知が動作しない
1. 通知権限を確認：`Notification.permission`
2. VAPIDキーが正しく設定されているか確認
3. Service Workerのpushイベントリスナーを確認

### Lighthouseスコアが低い
1. HTMLレポートで詳細を確認
2. 各監査項目の「Learn more」リンクを参照
3. 必須項目から順に修正

## PWA機能の確認コマンド一覧

```bash
# PWAアイコン生成
npm run generate-icons

# VAPIDキー生成
npm run generate-vapid

# PWAテスト実行
npm run test:pwa

# Lighthouse監査
npm run lighthouse

# 開発サーバー起動（PWA無効）
npm run dev

# 本番ビルド（PWA有効）
npm run build && npm start
```

## ベストプラクティス

1. **開発環境**ではPWA機能を無効化（next.config.js で設定済み）
2. **本番環境**でのみService Workerを有効化
3. **定期的**にLighthouse監査を実行
4. **CI/CD**パイプラインにPWAテストを組み込む
5. **実機**でのテストも実施（特にiOS Safari）

## 参考リンク

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
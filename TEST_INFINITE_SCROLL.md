# 無限スクロール機能テスト仕様書

## 📋 テスト概要

無限スクロール機能の包括的なテストスイートを実装しました。単体テスト、統合テスト、E2Eテストをカバーしています。

## 🧪 テストファイル構成

```
__tests__/
├── hooks/
│   └── useInfiniteScroll.test.tsx    # カスタムフックのテスト
├── components/
│   └── InfiniteScroll.test.tsx       # コンポーネントのテスト
└── api/
    └── posts-feed.test.ts             # APIエンドポイントのテスト

e2e/tests/
└── infinite-scroll.spec.ts            # E2Eテスト
```

## ✅ テストカバレッジ

### 1. **useInfiniteScrollフック** (`__tests__/hooks/useInfiniteScroll.test.tsx`)

- ✅ 初期データの取得
- ✅ カーソルベースページネーション
- ✅ ユーザーIDフィルタリング
- ✅ ハッシュタグフィルタリング
- ✅ エラーハンドリング
- ✅ 新着投稿コールバック
- ✅ デバウンス処理
- ✅ refetch機能
- ✅ スクロール位置の保存/復元

### 2. **InfiniteScrollコンポーネント** (`__tests__/components/InfiniteScroll.test.tsx`)

- ✅ 初期ローディング状態
- ✅ 投稿の表示
- ✅ スクロール時の次ページ読み込み
- ✅ エラーメッセージ表示
- ✅ 空の状態メッセージ
- ✅ 新着投稿通知
- ✅ 削除機能
- ✅ ユーザークリックイベント
- ✅ フィルター機能（ユーザー/ハッシュタグ）
- ✅ スクロールトップボタン
- ✅ 最終ページメッセージ
- ✅ 仮想スクロール有効化条件

### 3. **API Route** (`__tests__/api/posts-feed.test.ts`)

- ✅ 認証チェック
- ✅ 初回ページ取得
- ✅ カーソル付きページネーション
- ✅ ユーザーIDフィルター
- ✅ ハッシュタグフィルター
- ✅ フォロー中ユーザーのフィード
- ✅ エラーハンドリング
- ✅ リミットパラメータ検証

### 4. **E2Eテスト** (`e2e/tests/infinite-scroll.spec.ts`)

- ✅ 初期ロード時の投稿表示
- ✅ スクロールによる自動読み込み
- ✅ 複数回スクロールの動作
- ✅ 新着投稿通知
- ✅ エラー時の再試行
- ✅ スクロールトップボタン
- ✅ 投稿削除
- ✅ ハッシュタグフィルター
- ✅ 仮想スクロール動作
- ✅ ユーザープロフィールモーダル
- ✅ 空の状態表示
- ✅ 最下部到達メッセージ

## 🚀 テスト実行方法

### 単体テスト・統合テスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test useInfiniteScroll.test.tsx

# カバレッジ付きで実行
npm run test:coverage

# ウォッチモードで実行
npm run test:watch
```

### E2Eテスト

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグ用）
npm run test:e2e:ui

# ヘッドフルモードで実行（ブラウザ表示）
npm run test:e2e:headed

# 特定のテストファイルを実行
npx playwright test infinite-scroll.spec.ts
```

## 🔧 テスト環境設定

### 必要なパッケージ

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/user-event": "^14.6.1",
    "@playwright/test": "^1.55.0",
    "msw": "^2.x.x",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5"
  }
}
```

### MSW (Mock Service Worker)

APIモックのために`msw`を使用しています。テスト実行時に自動的にモックサーバーが起動します。

## 📊 パフォーマンステスト項目

### 仮想スクロール

- 50件以上の投稿で自動有効化
- DOM要素数の制限を確認
- スクロールのスムーズさ

### メモリ管理

- 古いページのアンロード
- メモリリークの監視
- ガベージコレクション

### ネットワーク

- APIコール回数の最適化
- デバウンス処理（300ms）
- キャッシュ動作

## 🐛 デバッグ方法

### Jest テスト

```bash
# デバッグモードで実行
npm run test:debug

# 特定のテストのみ実行
npm test -- -t "初期データを正しく取得する"
```

### Playwright E2E

```bash
# デバッグモードで実行
npm run test:e2e:debug

# トレース付きで実行
npx playwright test --trace on

# レポート表示
npx playwright show-report
```

## 🔍 既知の問題と制限

1. **新着投稿通知テスト**: 実環境では30秒のポーリング間隔があるため、E2Eテストではモックを使用
2. **仮想スクロール**: `@tanstack/react-virtual`のモックを使用（実際の仮想化動作はE2Eでテスト）
3. **認証状態**: テスト用のモックセッションを使用

## 📈 今後の改善点

1. **Visual Regression Testing**: スクリーンショット比較テストの追加
2. **Performance Testing**: Lighthouseを使用したパフォーマンステスト
3. **Accessibility Testing**: axe-coreを使用したアクセシビリティテスト
4. **Load Testing**: 大量データでのストレステスト

## 🎯 テスト成功基準

- ✅ 全単体テストがパス
- ✅ カバレッジ80%以上
- ✅ E2Eテストがパス
- ✅ メモリリークなし
- ✅ 20件/秒の読み込み速度

## 📚 参考資料

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [TanStack Query Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)
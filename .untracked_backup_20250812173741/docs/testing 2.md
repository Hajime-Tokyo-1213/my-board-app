# テスト設計書

## 概要

このドキュメントでは、掲示板アプリのテスト戦略と実装について説明します。

## テストカバレッジ目標

- **目標カバレッジ**: 70%以上
- **重点領域**:
  - コンポーネント: 80%以上
  - APIルート: 90%以上
  - ユーティリティ: 70%以上

## テストの種類

### 1. 単体テスト (Unit Tests)
- **フレームワーク**: Jest + React Testing Library
- **対象**: コンポーネント、API ルート、ユーティリティ関数
- **場所**: `src/__tests__/`

### 2. E2Eテスト (End-to-End Tests)
- **フレームワーク**: Playwright
- **対象**: ユーザーフロー全体
- **場所**: `e2e/tests/`

## ディレクトリ構造

```
my-board-app/
├── src/
│   └── __tests__/
│       ├── components/     # コンポーネントの単体テスト
│       │   ├── PostForm.test.tsx
│       │   └── PostCard.test.tsx
│       ├── api/           # APIルートのテスト
│       │   └── posts.test.ts
│       └── utils/         # テストユーティリティ
│           └── test-utils.tsx
├── e2e/
│   └── tests/
│       ├── bulletin-board.spec.ts  # メイン機能のE2Eテスト
│       └── mobile.spec.ts          # モバイル対応テスト
├── jest.config.ts         # Jest設定
├── jest.setup.ts          # Jestセットアップ
└── playwright.config.ts   # Playwright設定
```

## テストの実行方法

### 単体テストの実行

```bash
# すべての単体テストを実行
npm test

# ウォッチモードで実行
npm run test:watch

# カバレッジレポート付きで実行
npm run test:coverage
```

### E2Eテストの実行

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグに便利）
npm run test:e2e:ui

# デバッグモードで実行
npm run test:e2e:debug
```

## テストカバレッジ

### コンポーネントテスト

#### PostForm
- ✅ フォームの表示
- ✅ 文字数カウント
- ✅ 入力検証（空文字、200文字制限）
- ✅ 送信処理
- ✅ ローディング状態
- ✅ エラーハンドリング

#### PostCard
- ✅ 投稿の表示
- ✅ 日付フォーマット
- ✅ 編集モード切り替え
- ✅ 更新処理
- ✅ 削除処理
- ✅ エラーハンドリング

### APIテスト

#### GET /api/posts
- ✅ 投稿一覧の取得
- ✅ ソート順の確認
- ✅ エラーハンドリング

#### POST /api/posts
- ✅ 新規投稿の作成
- ✅ 入力検証
- ✅ エラーハンドリング

### E2Eテスト

#### メイン機能
- ✅ ページ表示
- ✅ 投稿の作成
- ✅ 投稿の編集
- ✅ 投稿の削除
- ✅ 文字数制限の確認
- ✅ 複数投稿の表示順
- ✅ キーボードナビゲーション
- ✅ エラー時の状態保持

#### モバイル対応
- ✅ レスポンシブ表示
- ✅ タッチ操作
- ✅ モバイルでの編集

## テストのベストプラクティス

### 1. テストの命名規則
- `describe`ブロックでコンポーネント/機能を明確に記述
- `it`/`test`で具体的な動作を説明
- 日本語での説明も可

### 2. テストの独立性
- 各テストは独立して実行可能
- `beforeEach`でセットアップ
- モックは各テストでリセット

### 3. ユーザー視点のテスト
- `getByRole`、`getByText`などアクセシブルなクエリを使用
- 実際のユーザー操作をシミュレート
- 実装の詳細ではなく動作をテスト

### 4. 待機処理
- `waitFor`を使用して非同期処理を適切に待機
- `userEvent`で実際のユーザー操作を再現

## モックの使用

### コンポーネントのモック
```typescript
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      // ...
    }
  }
}))
```

### APIのモック
```typescript
jest.mock('@/lib/mongodb');
jest.mock('@/models/Post');
```

## トラブルシューティング

### npm インストールエラー
権限エラーが発生した場合：
```bash
sudo chown -R $(whoami) ~/.npm
npm install
```

### テスト実行時のエラー
1. `node_modules`を削除して再インストール
2. Jest キャッシュをクリア: `jest --clearCache`
3. TypeScript の型エラーを確認

### E2Eテストの失敗
1. 開発サーバーが起動しているか確認
2. ポート3000が使用可能か確認
3. Playwrightのブラウザをアップデート: `npx playwright install`

## テストカバレッジの確認

### カバレッジレポートの生成
```bash
npm run test:coverage
```

### カバレッジの確認方法
1. コマンド実行後、`coverage/lcov-report/index.html`をブラウザで開く
2. 各ファイルのカバレッジ率を確認
3. 未テストの行は赤色でハイライトされる

### 目標カバレッジ達成のための追加実装
- PostFormコンポーネント: 20個のテストケース実装済み
- PostCardコンポーネント: 12個のテストケース実装済み
- API routes (posts): 8個のテストケース実装済み
- API routes ([id]): 16個のテストケース実装済み
- MongoDB接続: 11個のテストケース実装済み
- Postモデル: 18個のテストケース実装済み

## CI/CD統合

GitHub Actionsなどでの実行例：
```yaml
- name: Run unit tests
  run: npm test -- --ci --coverage
  
- name: Run E2E tests
  run: npm run test:e2e
```

## 今後の拡張

1. **パフォーマンステスト**: Lighthouseの統合
2. **ビジュアルリグレッションテスト**: Percy/Chromatic
3. **アクセシビリティテスト**: axe-core統合
4. **APIモックサーバー**: MSWの導入
5. **テストデータ管理**: Factoryパターンの実装
# テスト実行ガイド

## 概要

このドキュメントでは、掲示板アプリのテストを実行する方法について説明します。

## 前提条件

- Node.js 18.x または 20.x
- npm または yarn
- MongoDB (E2Eテスト用)
- Docker (オプション)

## クイックスタート

### 1. 依存関係のインストール

NPMキャッシュの権限エラーが発生する場合：
```bash
sudo chown -R $(whoami) ~/.npm
npm install --legacy-peer-deps
```

### 2. 簡単なテスト実行

すべてのテストを実行：
```bash
./scripts/run-tests.sh
```

## 個別のテスト実行

### ユニットテスト

```bash
# 基本的な実行
npm test

# ウォッチモード
npm run test:watch

# カバレッジ付き
npm run test:coverage

# 特定のファイルのみ
npm test -- PostForm.test.tsx

# 特定のテストスイートのみ
npm test -- --testNamePattern="PostForm"
```

### E2Eテスト

```bash
# すべてのE2Eテストを実行
npm run test:e2e

# UIモードで実行（デバッグ用）
npm run test:e2e:ui

# 特定のブラウザのみ
npm run test:e2e -- --project=chromium

# 特定のテストファイルのみ
npm run test:e2e post-crud-complete.spec.ts
```

## Dockerを使用したテスト実行

### 1. テスト環境の起動

```bash
# MongoDB とテスト環境を起動
docker-compose -f docker-compose.test.yml up -d mongodb

# すべてのテストを実行
docker-compose -f docker-compose.test.yml up app-test

# E2Eテストを実行
docker-compose -f docker-compose.test.yml up e2e-test
```

### 2. クリーンアップ

```bash
docker-compose -f docker-compose.test.yml down -v
```

## カバレッジレポート

### レポートの確認

1. `npm run test:coverage`を実行
2. ブラウザで`coverage/lcov-report/index.html`を開く
3. 各ファイルのカバレッジを確認

### カバレッジ目標

- 全体: 70%以上
- コンポーネント: 80%以上
- API: 90%以上
- ユーティリティ: 70%以上

## トラブルシューティング

### npm installエラー

```bash
# キャッシュクリア
npm cache clean --force

# legacy-peer-depsオプションを使用
npm install --legacy-peer-deps
```

### MongoDBエラー

```bash
# MongoDBが起動していることを確認
mongod --version

# Dockerを使用してMongoDBを起動
docker run -d -p 27017:27017 --name mongodb mongo:6
```

### Playwrightエラー

```bash
# ブラウザを再インストール
npx playwright install

# 依存関係も含めてインストール
npx playwright install --with-deps
```

### Jestエラー

```bash
# Jestキャッシュをクリア
npx jest --clearCache

# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## CI/CD環境での実行

### GitHub Actions

プッシュまたはプルリクエスト時に自動実行されます：
- Linting
- ユニットテスト（Node.js 18.x, 20.x）
- E2Eテスト
- セキュリティスキャン
- パフォーマンステスト

### 必要なSecrets

GitHub リポジトリに以下のSecretsを設定：
- `MONGODB_URI`: MongoDB接続文字列
- `CODECOV_TOKEN`: Codecovトークン（オプション）
- `VERCEL_TOKEN`: Vercelトークン（プレビューデプロイ用）
- `VERCEL_ORG_ID`: Vercel組織ID
- `VERCEL_PROJECT_ID`: VercelプロジェクトID

## パフォーマンス最適化

### テスト実行時間の短縮

1. **並列実行**: `maxWorkers: '50%'`でCPUの50%を使用
2. **テストの分割**: 大きなテストファイルを分割
3. **モックの活用**: 外部依存を適切にモック
4. **選択的実行**: 変更されたファイルのみテスト

### メモリ使用量の削減

```bash
# メモリ制限を設定してテスト実行
NODE_OPTIONS="--max-old-space-size=2048" npm test
```

## ベストプラクティス

1. **コミット前**: `./scripts/run-tests.sh`を実行
2. **プルリクエスト前**: すべてのテストが通ることを確認
3. **定期的な実行**: 開発中は`npm run test:watch`を使用
4. **カバレッジ確認**: 新機能追加時は必ずテストも追加

## 統計情報

現在のテスト実装状況：
- **ユニットテスト**: 85+ テストケース
- **E2Eテスト**: 20+ シナリオ
- **総テスト実行時間**: 約2-3分（ローカル環境）
- **目標カバレッジ**: 70%以上
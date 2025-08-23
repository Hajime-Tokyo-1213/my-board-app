# 推奨コマンド一覧

## 開発
- `npm run dev` - 開発サーバーを起動 (Turbopack使用)
- `npm run dev:all` - Next.jsとSocket.ioサーバーを同時起動
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクション実行

## コード品質チェック
- `npm run lint` - ESLintを実行
- `npm run lint:fix` - ESLintエラーを自動修正
- `npm run typecheck` - TypeScript型チェック
- `npm run format` - Prettierでコードフォーマット
- `npm run format:check` - フォーマットチェック

## テスト
- `npm test` - Jestテストを実行
- `npm run test:watch` - ウォッチモードでテスト
- `npm run test:coverage` - カバレッジ付きでテスト
- `npm run test:unit` - ユニットテストのみ
- `npm run test:integration` - 統合テストのみ
- `npm run test:e2e` - Playwrightでe2eテスト
- `npm run test:all` - 全テストを実行
- `npm run test:security` - セキュリティテスト

## 検証
- `npm run verify` - lint、型チェック、テストを全て実行
- `npm run precommit` - コミット前チェック

## ユーティリティ
- `npm run clean` - ビルド成果物をクリーン
- `npm run clean:deps` - 依存関係を再インストール
- `npm run seed-dummy` - ダミーデータを投入

## Git
- `git status` - 変更状況を確認
- `git add .` - 全ファイルをステージング
- `git commit -m "message"` - コミット
- `git push` - リモートにプッシュ
- `git pull` - リモートから取得

## システム (Darwin/macOS)
- `ls` - ファイル一覧
- `cd` - ディレクトリ移動
- `grep` - ファイル内検索 (ripgrep `rg`推奨)
- `find` - ファイル検索
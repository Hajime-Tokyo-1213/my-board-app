# プロジェクト概要

## プロジェクト名
my-board-app - SNS機能を持つボードアプリケーション

## 目的
Next.js 15を使用したソーシャルネットワーキング機能を持つWebアプリケーション。投稿、フォロー、いいね、コメント、通知機能などを実装。

## 技術スタック
- **フロントエンド**: Next.js 15.4.5, React 19.1.0, TypeScript
- **UI**: Material-UI (@mui/material), Tailwind CSS, Framer Motion
- **データベース**: MongoDB (Mongoose 8.17.0)
- **認証**: NextAuth.js 4.24.11
- **リアルタイム通信**: Socket.io 4.8.1
- **状態管理**: TanStack Query (React Query) 5.85.5
- **フォーム**: React Hook Form 7.62.0, Zod 4.0.17
- **画像処理**: Cloudinary 2.7.0
- **PWA**: next-pwa, web-push
- **テスト**: Jest, Playwright, Testing Library

## プロジェクト構造
- `/app` - Next.js App Router ディレクトリ
  - `/api` - APIルート
  - `/auth` - 認証関連ページ
  - `/posts` - 投稿関連ページ
  - `/profile` - プロフィール関連ページ
  - `/search` - 検索機能
  - `/timeline` - タイムライン
- `/components` - Reactコンポーネント
- `/models` - Mongooseモデル (User, Post, Comment, Follow, Notification等)
- `/utils` - ユーティリティ関数
- `/hooks` - カスタムReactフック
- `/contexts` - Reactコンテキスト
- `/lib` - ライブラリ設定
- `/server` - サーバーサイドコード (Socket.io サーバー等)
- `/tests`, `/e2e`, `/__tests__` - テストファイル

## 主要機能
- ユーザー認証・認可
- 投稿 (CRUD操作)
- フォロー/フォロワー機能
- いいね機能
- コメント機能
- リアルタイム通知
- 画像アップロード
- ハッシュタグ
- 検索機能
- プライバシー設定
- PWA対応
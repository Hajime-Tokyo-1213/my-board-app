# コードスタイルと規約

## TypeScript/JavaScript
- TypeScriptを使用 (厳密な型定義)
- 関数コンポーネントを使用 (クラスコンポーネントは避ける)
- ES6+の機能を活用 (アロー関数、分割代入、テンプレートリテラル等)

## 命名規則
- コンポーネント: PascalCase (例: `UserProfile`, `PostList`)
- 関数・変数: camelCase (例: `getUserData`, `isLoading`)
- 定数: UPPER_SNAKE_CASE (例: `MAX_POST_LENGTH`)
- ファイル名:
  - コンポーネント: PascalCase.tsx (例: `PostCard.tsx`)
  - ユーティリティ: camelCase.ts (例: `formatDate.ts`)
  - APIルート: kebab-case/route.ts

## React/Next.js
- Next.js 15 App Routerを使用
- Client Componentは必要な場合のみ使用 ('use client'ディレクティブ)
- Server Componentsをデフォルトで使用
- React Hooksの適切な使用
- カスタムフックは`use`プレフィックス

## スタイリング
- Tailwind CSSクラスを主に使用
- Material-UIコンポーネントも併用
- レスポンシブデザインを考慮
- `clsx`や`tailwind-merge`でクラス名を管理

## データフェッチング
- TanStack Query (React Query)を使用
- Server Componentsでのfetch
- Client ComponentsではuseQueryフック

## フォーム
- React Hook Form + Zodでバリデーション
- エラーハンドリングを適切に実装

## セキュリティ
- 入力値のサニタイゼーション (DOMPurify使用)
- 環境変数で機密情報を管理
- XSS、CSRF対策を実装

## コメント
- 必要最小限のコメント
- 複雑なロジックのみ説明
- JSDocは型定義が不明瞭な場合のみ
# セキュリティ対策設計書

## 1. 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│                    クライアント                      │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   Middlewares                        │
│  ┌──────────────────────────────────────────────┐   │
│  │ 1. セキュリティヘッダー (CSP, HSTS, etc)      │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 2. レート制限 (LRU Cache)                    │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 3. CSRF保護                                  │   │
│  ├──────────────────────────────────────────────┤   │
│  │ 4. 監査ログ                                  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                   API Routes                         │
│  ・入力値検証                                        │
│  ・サニタイゼーション                                │
│  ・認証・認可チェック                                │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│                    MongoDB                           │
│  ・監査ログコレクション                              │
│  ・セッション管理                                    │
└─────────────────────────────────────────────────────┘
```

## 2. 各セキュリティ対策の詳細設計

### 2.1 レート制限（Rate Limiting）

**実装方法：**
- LRU Cacheを使用したメモリベースの制限
- IPアドレスベースとユーザーIDベースの2層構造
- スライディングウィンドウ方式

**設定値：**
```javascript
const rateLimits = {
  // API全体
  global: { window: 60000, max: 60 },      // 1分間に60リクエスト
  
  // 認証関連
  auth: { window: 60000, max: 5 },         // 1分間に5回
  
  // 投稿作成
  createPost: { window: 60000, max: 5 },   // 1分間に5投稿
  
  // 投稿更新
  updatePost: { window: 60000, max: 10 },  // 1分間に10回
  
  // いいね
  like: { window: 60000, max: 30 }         // 1分間に30回
}
```

### 2.2 セキュリティヘッダー

**必須ヘッダー：**
```javascript
const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self' data:;
    connect-src 'self';
    frame-ancestors 'none';
  `,
  
  // その他のセキュリティヘッダー
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // HTTPS強制
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
}
```

### 2.3 XSS対策

**入力値サニタイゼーション：**
- DOMPurifyを使用したHTMLサニタイゼーション
- 特殊文字のエスケープ
- Reactの自動エスケープ機能を活用

**実装箇所：**
1. API入力時点でのサニタイゼーション
2. データベース保存前の検証
3. 表示時の追加エスケープ

### 2.4 CSRF対策

**実装方法：**
- NextAuthの組み込みCSRF保護を活用
- カスタムCSRFトークンの実装
- SameSite Cookieの設定

**Cookie設定：**
```javascript
cookies: {
  sessionToken: {
    name: 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    }
  }
}
```

### 2.5 セッション管理の最適化

**設定内容：**
- セッションタイムアウト: 30分（アクティビティなし）
- 絶対タイムアウト: 24時間
- セッション更新: 5分ごと
- 同時セッション数制限: 3デバイスまで

### 2.6 監査ログ

**記録項目：**
```typescript
interface AuditLog {
  timestamp: Date;
  userId?: string;
  userEmail?: string;
  ipAddress: string;
  userAgent: string;
  action: string;        // LOGIN, LOGOUT, CREATE_POST, UPDATE_POST, DELETE_POST
  resource?: string;     // 対象リソースID
  result: 'success' | 'failure';
  errorMessage?: string;
  metadata?: object;     // 追加情報
}
```

**保存期間：**
- 成功ログ: 90日
- 失敗ログ: 180日
- セキュリティイベント: 1年

## 3. 実装優先順位

1. **Phase 1（即座に実装）**
   - レート制限
   - セキュリティヘッダー
   - XSS対策（基本）

2. **Phase 2（次に実装）**
   - CSRF対策
   - セッション管理最適化

3. **Phase 3（その後実装）**
   - 監査ログ
   - 高度なXSS対策

## 4. パッケージ依存関係

```json
{
  "dependencies": {
    "lru-cache": "^10.0.0",        // レート制限用
    "dompurify": "^3.0.0",          // XSS対策
    "helmet": "^7.0.0",             // セキュリティヘッダー
    "express-rate-limit": "^7.0.0", // 追加のレート制限
    "winston": "^3.0.0"             // ログ管理
  }
}
```

## 5. テスト項目

### 5.1 レート制限テスト
- 制限値を超えた場合の429エラー確認
- リセット時間の確認
- 異なるエンドポイント間の独立性

### 5.2 XSSテスト
- スクリプトインジェクション防止
- HTMLインジェクション防止
- イベントハンドラー無効化

### 5.3 CSRF テスト
- トークンなしリクエストの拒否
- 無効なトークンの拒否
- 正しいトークンでの成功

### 5.4 監査ログテスト
- すべてのアクションが記録されること
- ログの完全性
- パフォーマンスへの影響

## 6. モニタリング

### 6.1 アラート設定
- レート制限の頻繁な発動
- 認証失敗の急増
- 異常なアクセスパターン

### 6.2 ダッシュボード項目
- レート制限統計
- セキュリティイベント数
- 認証成功/失敗率
- 監査ログサマリー

## 7. インシデント対応

### 7.1 対応フロー
1. 監査ログの確認
2. 影響範囲の特定
3. 一時的な制限強化
4. 根本原因の調査
5. 対策の実装

### 7.2 エスカレーション基準
- 1時間に100回以上の認証失敗
- XSS攻撃の検出
- CSRF攻撃の検出
- 異常なデータアクセスパターン

## 8. コンプライアンス

### 8.1 準拠規格
- OWASP Top 10対策
- GDPR（個人情報保護）
- セキュリティベストプラクティス

### 8.2 定期レビュー
- 月次: ログレビュー
- 四半期: セキュリティ設定レビュー
- 年次: ペネトレーションテスト
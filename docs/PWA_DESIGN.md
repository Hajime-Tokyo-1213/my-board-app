# PWA対応設計書

## 概要
Next.js 15とnext-pwaを使用したPWA（Progressive Web App）機能の実装設計

## アーキテクチャ

### 技術スタック
- **Next.js 15**: アプリケーションフレームワーク
- **next-pwa**: Service Worker自動生成・管理
- **Web Push API**: プッシュ通知
- **Workbox**: Service Workerのキャッシュ戦略

## 機能要件

### 1. ホーム画面への追加
- Web App Manifestによるアプリメタデータ定義
- アイコンセット（各サイズ対応）
- スプラッシュスクリーン
- スタンドアロンモード

### 2. オフライン対応
#### キャッシュ戦略
- **Cache First**: 静的アセット（画像、CSS、JS）
- **Network First**: APIレスポンス、動的コンテンツ
- **Stale While Revalidate**: ユーザープロフィール、投稿データ

#### オフライン時の機能
- 投稿の下書き保存（IndexedDB）
- キャッシュ済みコンテンツの閲覧
- オフライン状態の通知UI

### 3. プッシュ通知
#### 通知タイプ
- 新規フォロー
- いいね
- コメント
- メンション
- システム通知

#### 実装フロー
```
1. 通知許可リクエスト
2. Service Worker登録
3. Push Subscription取得
4. サーバーへsubscription送信
5. サーバーからプッシュ通知送信
```

### 4. インストール促進UI
- beforeinstallpromptイベントの捕捉
- カスタムインストールバナー
- インストール後のウェルカムメッセージ

## 実装構成

### ディレクトリ構造
```
my-board-app/
├── public/
│   ├── manifest.json          # Web App Manifest
│   ├── icons/                 # PWAアイコン
│   │   ├── icon-72x72.png
│   │   ├── icon-96x96.png
│   │   ├── icon-128x128.png
│   │   ├── icon-144x144.png
│   │   ├── icon-152x152.png
│   │   ├── icon-192x192.png
│   │   ├── icon-384x384.png
│   │   └── icon-512x512.png
│   └── sw.js                  # Service Worker（自動生成）
├── src/
│   ├── components/
│   │   ├── InstallPrompt.tsx  # インストール促進UI
│   │   ├── OfflineIndicator.tsx # オフライン状態表示
│   │   └── NotificationPermission.tsx # 通知許可UI
│   ├── hooks/
│   │   ├── usePWA.ts          # PWA関連フック
│   │   ├── useOnline.ts       # オンライン状態監視
│   │   └── usePushNotification.ts # プッシュ通知
│   ├── lib/
│   │   ├── pwa/
│   │   │   ├── notification.ts # 通知処理
│   │   │   ├── subscription.ts # Push subscription管理
│   │   │   └── offline.ts     # オフライン処理
│   │   └── db/
│   │       └── indexedDB.ts   # オフラインストレージ
│   └── workers/
│       └── custom-sw.js       # カスタムService Worker
├── next.config.js              # next-pwa設定
└── .env.local                  # VAPID keys等

```

## Service Worker設定

### next.config.js
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 // 24時間
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30 // 30日
        }
      }
    }
  ]
})
```

## Web App Manifest

### manifest.json
```json
{
  "name": "My Board App",
  "short_name": "Board",
  "description": "SNS掲示板アプリケーション",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    // 他のサイズも同様
  ],
  "categories": ["social", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1080x1920",
      "type": "image/png"
    }
  ]
}
```

## プッシュ通知実装

### サーバー側（API）
```typescript
// app/api/notifications/subscribe/route.ts
export async function POST(request: Request) {
  const subscription = await request.json()
  // DBに保存
  await saveSubscription(subscription)
  return Response.json({ success: true })
}

// app/api/notifications/push/route.ts
export async function POST(request: Request) {
  const { userId, title, body, data } = await request.json()
  const subscriptions = await getSubscriptions(userId)
  
  for (const subscription of subscriptions) {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title, body, data })
    )
  }
}
```

### クライアント側
```typescript
// hooks/usePushNotification.ts
export function usePushNotification() {
  const subscribe = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    })
    
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription)
    })
  }
}
```

## オフライン機能

### IndexedDB構造
```typescript
// lib/db/indexedDB.ts
const DB_NAME = 'BoardAppDB'
const DB_VERSION = 1

const stores = {
  drafts: 'id, content, createdAt, updatedAt',
  cachedPosts: 'id, data, timestamp',
  pendingActions: 'id, type, payload, timestamp'
}

// 下書き保存
async function saveDraft(content: string) {
  const db = await openDB()
  await db.add('drafts', {
    content,
    createdAt: Date.now(),
    updatedAt: Date.now()
  })
}

// オフライン時のアクション保存
async function queueAction(action: PendingAction) {
  const db = await openDB()
  await db.add('pendingActions', action)
}
```

## インストール促進UI

### コンポーネント
```typescript
// components/InstallPrompt.tsx
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    })
  }, [])
  
  const handleInstall = async () => {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      // インストール成功
    }
  }
}
```

## パフォーマンス最適化

### 1. Service Workerの最適化
- 不要なリソースのキャッシュ回避
- キャッシュサイズの制限
- 定期的なキャッシュクリーンアップ

### 2. 遅延読み込み
- 通知機能の遅延初期化
- オフライン機能の条件付き読み込み

### 3. バンドルサイズ
- next-pwaの本番環境のみ有効化
- 未使用機能のツリーシェイキング

## セキュリティ考慮事項

### 1. HTTPS必須
- Service WorkerはHTTPSでのみ動作
- localhost例外あり

### 2. CSP（Content Security Policy）
```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  connect-src 'self' https://api.example.com;
```

### 3. プッシュ通知の認証
- VAPID認証の実装
- ユーザー別のsubscription管理
- 不正な通知送信の防止

## テスト戦略

### 1. 単体テスト
- Service Worker登録
- キャッシュ処理
- IndexedDB操作

### 2. 統合テスト
- オフライン→オンライン同期
- プッシュ通知の送受信
- インストールフロー

### 3. E2Eテスト
- PWAインストール
- オフライン時の動作
- 通知の表示

## 実装優先順位

1. **Phase 1**: 基本PWA設定（1週間）
   - manifest.json作成
   - Service Worker基本設定
   - アイコン作成

2. **Phase 2**: オフライン対応（1週間）
   - キャッシュ戦略実装
   - IndexedDB設定
   - オフラインUI

3. **Phase 3**: プッシュ通知（1週間）
   - VAPID設定
   - subscription管理
   - 通知API実装

4. **Phase 4**: UX改善（3日）
   - インストール促進UI
   - オフライン状態表示
   - 同期状態表示

## モニタリング

### メトリクス
- Service Worker登録率
- PWAインストール率
- オフライン使用率
- 通知許可率
- キャッシュヒット率

### ツール
- Chrome DevTools（PWA監査）
- Lighthouse CI
- Web Vitals
- カスタムアナリティクス

## 今後の拡張

1. **バックグラウンド同期**
   - オフライン時の投稿自動送信
   - 定期的なデータ同期

2. **高度なキャッシュ戦略**
   - 予測プリフェッチ
   - 動的キャッシュ更新

3. **ネイティブ機能統合**
   - カメラアクセス
   - 位置情報
   - ファイルシステムアクセス
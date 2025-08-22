# パフォーマンス最適化設計書

## 1. 概要
Next.js 15、MongoDB、Cloudinary を活用した SNS アプリケーションのパフォーマンス最適化戦略を定義します。

## 2. 画像最適化戦略

### 2.1 Cloudinary の高度な活用
```javascript
// 自動フォーマット変換設定
{
  transformation: [
    { fetch_format: 'auto' },  // WebP/AVIF 自動変換
    { quality: 'auto:eco' },    // 品質自動調整
    { dpr: 'auto' }            // デバイスピクセル比対応
  ]
}
```

### 2.2 画像の遅延読み込み実装
```typescript
// Next.js Image コンポーネントの活用
import Image from 'next/image';

<Image
  src={cloudinaryUrl}
  alt="post image"
  loading="lazy"
  placeholder="blur"
  blurDataURL={thumbnailUrl}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### 2.3 レスポンシブ画像配信
```typescript
// Cloudinary の動的変換 URL 生成
const getOptimizedImageUrl = (publicId: string, viewport: 'mobile' | 'tablet' | 'desktop') => {
  const transformations = {
    mobile: { width: 640, quality: 'auto:low' },
    tablet: { width: 1024, quality: 'auto:good' },
    desktop: { width: 1920, quality: 'auto:best' }
  };
  
  return cloudinary.url(publicId, {
    transformation: [
      transformations[viewport],
      { format: 'auto' },
      { progressive: true }
    ]
  });
};
```

## 3. JavaScript バンドル最適化

### 3.1 動的インポートとコード分割
```typescript
// コンポーネントの遅延読み込み
const ImageUploader = dynamic(() => import('@/components/ImageUploader'), {
  loading: () => <Skeleton />,
  ssr: false
});

const HashtagDashboard = dynamic(() => import('@/components/HashtagDashboard'), {
  loading: () => <DashboardSkeleton />
});
```

### 3.2 ルートベースのコード分割
```typescript
// app/layout.tsx での最適化
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <Suspense fallback={<Loading />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
```

### 3.3 ツリーシェイキングの強化
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lodash', '@mui/material', '@mui/icons-material']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            priority: 10
          },
          common: {
            minChunks: 2,
            priority: 5,
            reuseExistingChunk: true
          }
        }
      };
    }
    return config;
  }
};
```

## 4. キャッシュ戦略

### 4.1 ブラウザキャッシュの最適化
```typescript
// middleware.ts でのキャッシュヘッダー設定
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 静的アセットのキャッシュ
  if (request.nextUrl.pathname.startsWith('/_next/static')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  
  // API レスポンスのキャッシュ
  if (request.nextUrl.pathname.startsWith('/api/posts')) {
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  }
  
  return response;
}
```

### 4.2 Redis キャッシュレイヤー
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis';

class CacheManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      url: process.env.REDIS_URL!,
      token: process.env.REDIS_TOKEN!
    });
  }
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached as string) : null;
  }
  
  async set(key: string, value: any, ttl: number = 3600) {
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export const cache = new CacheManager();
```

### 4.3 API レスポンスキャッシュ
```typescript
// app/api/posts/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const cacheKey = `posts:page:${page}`;
  
  // キャッシュチェック
  const cached = await cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT' }
    });
  }
  
  // DB クエリ
  const posts = await fetchPosts(page);
  
  // キャッシュ保存
  await cache.set(cacheKey, posts, 300); // 5分間キャッシュ
  
  return NextResponse.json(posts, {
    headers: { 'X-Cache': 'MISS' }
  });
}
```

## 5. Core Web Vitals 改善

### 5.1 LCP (Largest Contentful Paint) 最適化
```typescript
// プリロードの実装
export default function PostPage() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={heroImageUrl}
        imageSrcSet={`${heroImageUrl}?w=640 640w, ${heroImageUrl}?w=1024 1024w`}
      />
      <HeroImage priority={true} />
    </>
  );
}
```

### 5.2 FID (First Input Delay) 改善
```typescript
// インタラクティブ要素の最適化
const PostInteractions = dynamic(() => import('./PostInteractions'), {
  loading: () => <InteractionSkeleton />,
  ssr: false // クライアントサイドのみでレンダリング
});

// デバウンス処理
const debouncedSearch = useMemo(
  () => debounce((value: string) => {
    searchPosts(value);
  }, 300),
  []
);
```

### 5.3 CLS (Cumulative Layout Shift) 防止
```css
/* 画像コンテナのアスペクト比固定 */
.image-container {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
}

/* スケルトンローダーのサイズ固定 */
.skeleton {
  width: 100%;
  height: 400px;
  animation: shimmer 2s infinite;
}
```

## 6. レンダリング最適化

### 6.1 Incremental Static Regeneration (ISR)
```typescript
// app/posts/[id]/page.tsx
export const revalidate = 60; // 60秒ごとに再生成

export async function generateStaticParams() {
  const posts = await getPopularPosts(10);
  return posts.map((post) => ({
    id: post._id.toString()
  }));
}
```

### 6.2 ストリーミング SSR
```typescript
// app/page.tsx
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <div>
      <Header />
      <Suspense fallback={<TimelineSkeleton />}>
        <Timeline />
      </Suspense>
      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar />
      </Suspense>
    </div>
  );
}
```

### 6.3 React Server Components の活用
```typescript
// app/components/PostList.tsx (Server Component)
async function PostList({ userId }: { userId: string }) {
  const posts = await db.posts.find({ userId }).toArray();
  
  return (
    <div>
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

## 7. データベース最適化

### 7.1 インデックス戦略
```javascript
// MongoDB インデックス設定
db.posts.createIndex({ createdAt: -1 });
db.posts.createIndex({ userId: 1, createdAt: -1 });
db.posts.createIndex({ "hashtags": 1 });
db.posts.createIndex({ "$**": "text" }); // 全文検索

// 複合インデックス
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
```

### 7.2 クエリ最適化
```typescript
// 集約パイプラインの最適化
const getTimelinePosts = async (userId: string, page: number) => {
  return await db.posts.aggregate([
    {
      $match: {
        $or: [
          { userId: userId },
          { userId: { $in: followingIds } }
        ]
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * 20 },
    { $limit: 20 },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          { $project: { name: 1, avatar: 1 } }
        ]
      }
    }
  ]).toArray();
};
```

## 8. ネットワーク最適化

### 8.1 HTTP/2 プッシュとプリロード
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Link',
            value: '</fonts/noto-sans.woff2>; rel=preload; as=font; crossorigin'
          }
        ]
      }
    ];
  }
};
```

### 8.2 API ペイロード最小化
```typescript
// GraphQL フラグメントの活用
const POST_FRAGMENT = gql`
  fragment PostCore on Post {
    id
    content
    createdAt
    likesCount
    user {
      id
      name
      avatar
    }
  }
`;

// 必要なフィールドのみ取得
const GET_TIMELINE = gql`
  query GetTimeline($page: Int!) {
    timeline(page: $page) {
      ...PostCore
      ${includeComments ? 'comments { ...CommentCore }' : ''}
    }
  }
  ${POST_FRAGMENT}
`;
```

## 9. 監視とメトリクス

### 9.1 Web Vitals 監視
```typescript
// app/providers.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    // Analytics に送信
    window.gtag('event', metric.name, {
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      event_label: metric.id,
      non_interaction: true
    });
    
    // パフォーマンス閾値チェック
    const thresholds = {
      LCP: 2500,
      FID: 100,
      CLS: 0.1,
      TTFB: 600
    };
    
    if (metric.value > thresholds[metric.name]) {
      console.warn(`Poor ${metric.name}:`, metric.value);
    }
  });
  
  return null;
}
```

### 9.2 カスタムメトリクス
```typescript
// lib/performance.ts
class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  
  mark(name: string) {
    this.marks.set(name, performance.now());
  }
  
  measure(name: string, startMark: string, endMark?: string) {
    const start = this.marks.get(startMark) || 0;
    const end = endMark ? (this.marks.get(endMark) || performance.now()) : performance.now();
    const duration = end - start;
    
    // メトリクス送信
    this.sendMetric(name, duration);
    
    return duration;
  }
  
  private sendMetric(name: string, value: number) {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance', {
        event_category: 'Custom Metrics',
        event_label: name,
        value: Math.round(value)
      });
    }
  }
}

export const perfMonitor = new PerformanceMonitor();
```

## 10. 実装優先順位

### Phase 1: 即効性の高い最適化（1週間）
1. Next.js Image コンポーネントへの移行
2. 動的インポートの実装
3. 基本的なキャッシュヘッダー設定
4. MongoDB インデックスの追加

### Phase 2: 中期的な改善（2週間）
1. Redis キャッシュレイヤーの実装
2. Cloudinary の高度な変換機能活用
3. React Server Components への移行
4. ストリーミング SSR の実装

### Phase 3: 継続的な最適化（継続的）
1. Web Vitals の監視と改善
2. バンドルサイズの分析と削減
3. データベースクエリの最適化
4. A/B テストによる最適化検証

## 11. パフォーマンス目標

### Core Web Vitals 目標値
- **LCP**: < 2.5秒（理想: < 1.8秒）
- **FID**: < 100ms（理想: < 50ms）
- **CLS**: < 0.1（理想: < 0.05）
- **TTFB**: < 600ms（理想: < 400ms）

### その他のメトリクス
- **初回ロード時間**: < 3秒（3G環境）
- **JavaScript バンドルサイズ**: < 200KB（gzip圧縮後）
- **画像最適化率**: 90%以上をWebP/AVIF形式で配信
- **キャッシュヒット率**: 80%以上

## 12. テスト戦略

### パフォーマンステスト
```bash
# Lighthouse CI の設定
npm install -g @lhci/cli

# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/posts/1'],
      numberOfRuns: 3
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      }
    }
  }
};
```

### 負荷テスト
```javascript
// k6 負荷テストスクリプト
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },
    { duration: '10m', target: 100 },
    { duration: '5m', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1']
  }
};

export default function() {
  const res = http.get('https://your-app.com/api/posts');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
  sleep(1);
}
```

## まとめ

このパフォーマンス最適化設計により、以下の効果が期待できます：

1. **ユーザー体験の向上**: ページロード時間を50%削減
2. **サーバーコストの削減**: キャッシュによりDB負荷を70%削減
3. **SEOの改善**: Core Web Vitals スコアの向上
4. **スケーラビリティ**: 同時接続数を3倍に拡張可能

継続的なモニタリングと改善により、高速で快適なSNSアプリケーションを実現します。
import { test, expect, Page } from '@playwright/test';
import { performance } from 'perf_hooks';

// Core Web Vitals の閾値
const WEB_VITALS_THRESHOLDS = {
  LCP: 2500, // 2.5秒以内
  FID: 100,  // 100ms以内
  CLS: 0.1,  // 0.1以内
  FCP: 1800, // 1.8秒以内
  TTFB: 600, // 600ms以内
};

// カスタムメトリクス収集関数
async function collectMetrics(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const metrics: any = {
        navigation: {},
        paint: {},
        resource: [],
        memory: {},
      };

      // Navigation Timing API
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        metrics.navigation = {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
          domInteractive: navTiming.domInteractive - navTiming.fetchStart,
          ttfb: navTiming.responseStart - navTiming.requestStart,
        };
      }

      // Paint Timing API
      const paintMetrics = performance.getEntriesByType('paint');
      paintMetrics.forEach((metric: any) => {
        metrics.paint[metric.name] = metric.startTime;
      });

      // Resource Timing API
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      metrics.resource = resources.map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize,
        type: resource.initiatorType,
      }));

      // Memory Usage (Chrome only)
      if ((performance as any).memory) {
        metrics.memory = {
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        };
      }

      resolve(metrics);
    });
  });
}

// Web Vitals を収集
async function collectWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals: any = {};
      
      // LCP (Largest Contentful Paint)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // FID (First Input Delay) - シミュレート
      new PerformanceObserver((list) => {
        const entries = list.getEntries() as any[];
        if (entries.length > 0) {
          vitals.FID = entries[0].processingStart - entries[0].startTime;
        }
      }).observe({ type: 'first-input', buffered: true });

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        vitals.CLS = clsValue;
      }).observe({ type: 'layout-shift', buffered: true });

      // FCP (First Contentful Paint)
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        vitals.FCP = fcpEntry.startTime;
      }

      // TTFB (Time to First Byte)
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navTiming) {
        vitals.TTFB = navTiming.responseStart - navTiming.requestStart;
      }

      setTimeout(() => resolve(vitals), 3000); // 3秒待ってメトリクスを収集
    });
  });
}

test.describe('Performance Testing', () => {
  test.describe('ページロードパフォーマンス', () => {
    test('ホームページのCore Web Vitalsが基準を満たす', async ({ page }) => {
      await page.goto('/');
      
      // ページが完全にロードされるまで待つ
      await page.waitForLoadState('networkidle');
      
      const vitals = await collectWebVitals(page) as any;
      
      // Core Web Vitals の検証
      expect(vitals.LCP, 'LCP should be less than 2.5s').toBeLessThan(WEB_VITALS_THRESHOLDS.LCP);
      expect(vitals.FCP, 'FCP should be less than 1.8s').toBeLessThan(WEB_VITALS_THRESHOLDS.FCP);
      expect(vitals.TTFB, 'TTFB should be less than 600ms').toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB);
      
      if (vitals.CLS !== undefined) {
        expect(vitals.CLS, 'CLS should be less than 0.1').toBeLessThan(WEB_VITALS_THRESHOLDS.CLS);
      }
    });

    test('投稿詳細ページのパフォーマンス', async ({ page }) => {
      // まずホームページに移動
      await page.goto('/');
      
      // 最初の投稿をクリック
      const firstPost = await page.locator('[data-testid="post-card"]').first();
      
      // ナビゲーション開始時刻を記録
      const navigationStart = Date.now();
      
      await Promise.all([
        page.waitForNavigation(),
        firstPost.click(),
      ]);
      
      const navigationEnd = Date.now();
      const navigationTime = navigationEnd - navigationStart;
      
      // ナビゲーション時間が3秒以内であることを確認
      expect(navigationTime).toBeLessThan(3000);
      
      // メトリクスを収集
      const metrics = await collectMetrics(page) as any;
      
      expect(metrics.navigation.ttfb).toBeLessThan(WEB_VITALS_THRESHOLDS.TTFB);
      expect(metrics.paint['first-contentful-paint']).toBeLessThan(WEB_VITALS_THRESHOLDS.FCP);
    });
  });

  test.describe('画像最適化', () => {
    test('画像の遅延読み込みが機能する', async ({ page }) => {
      await page.goto('/');
      
      // 初期状態で viewport 外の画像がロードされていないことを確認
      const lazyImages = await page.locator('img[loading="lazy"]').all();
      
      for (const img of lazyImages) {
        const isInViewport = await img.isIntersectingViewport();
        if (!isInViewport) {
          // viewport 外の画像は src が設定されていないか、ロードされていない
          const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);
          expect(naturalHeight).toBe(0);
        }
      }
      
      // スクロールして画像をviewportに入れる
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1000); // 画像ロードを待つ
      
      // スクロール後、画像がロードされることを確認
      for (const img of lazyImages) {
        const isInViewport = await img.isIntersectingViewport();
        if (isInViewport) {
          const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);
          expect(naturalHeight).toBeGreaterThan(0);
        }
      }
    });

    test('最適化された画像フォーマットが使用される', async ({ page }) => {
      await page.goto('/');
      
      // ネットワークリクエストを監視
      const imageRequests: string[] = [];
      
      page.on('request', request => {
        if (request.resourceType() === 'image') {
          imageRequests.push(request.url());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // WebP または AVIF フォーマットの画像が使用されているか確認
      const optimizedFormats = imageRequests.filter(url => 
        url.includes('f_auto') || 
        url.includes('.webp') || 
        url.includes('.avif') ||
        url.includes('cloudinary')
      );
      
      expect(optimizedFormats.length).toBeGreaterThan(0);
    });
  });

  test.describe('コード分割とバンドル最適化', () => {
    test('動的インポートが機能する', async ({ page }) => {
      await page.goto('/');
      
      // 初期バンドルサイズを測定
      const coverage = await page.coverage.startJSCoverage();
      
      // ページをリロード
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const initialCoverage = await page.coverage.stopJSCoverage();
      const initialBundleSize = initialCoverage.reduce((total, entry) => {
        return total + entry.text.length;
      }, 0);
      
      // 動的にロードされるコンポーネントをトリガー
      await page.click('[data-testid="comment-toggle"]');
      await page.waitForTimeout(1000);
      
      // 追加のJSがロードされることを確認
      const additionalRequests = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter((entry: any) => entry.name.includes('.js') && entry.startTime > 1000)
          .length;
      });
      
      expect(additionalRequests).toBeGreaterThan(0);
    });

    test('適切なチャンク分割が行われる', async ({ page }) => {
      const jsFiles: { url: string; size: number }[] = [];
      
      page.on('response', async response => {
        const url = response.url();
        if (url.endsWith('.js') || url.includes('.js?')) {
          const body = await response.body();
          jsFiles.push({
            url,
            size: body.length,
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // vendor チャンクが存在することを確認
      const vendorChunk = jsFiles.find(file => file.url.includes('vendor'));
      expect(vendorChunk).toBeDefined();
      
      // React チャンクが分離されていることを確認
      const reactChunk = jsFiles.find(file => file.url.includes('react'));
      expect(reactChunk).toBeDefined();
      
      // 各チャンクが適切なサイズであることを確認（500KB以下）
      jsFiles.forEach(file => {
        expect(file.size, `${file.url} should be less than 500KB`).toBeLessThan(512000);
      });
    });
  });

  test.describe('キャッシュ戦略', () => {
    test('静的アセットが適切にキャッシュされる', async ({ page }) => {
      const cachedResources: { url: string; cacheControl: string | null }[] = [];
      
      page.on('response', response => {
        const url = response.url();
        const cacheControl = response.headers()['cache-control'];
        
        if (url.includes('/_next/static') || url.includes('/fonts')) {
          cachedResources.push({ url, cacheControl });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 静的アセットが長期キャッシュされることを確認
      cachedResources.forEach(resource => {
        expect(resource.cacheControl).toContain('max-age=31536000');
        expect(resource.cacheControl).toContain('immutable');
      });
    });

    test('APIレスポンスがキャッシュされる', async ({ page }) => {
      // 最初のリクエスト
      await page.goto('/');
      
      const firstResponse = await page.evaluate(async () => {
        const response = await fetch('/api/posts');
        return {
          ok: response.ok,
          cacheHeader: response.headers.get('x-cache'),
        };
      });
      
      // 2回目のリクエスト（キャッシュから）
      await page.reload();
      
      const secondResponse = await page.evaluate(async () => {
        const response = await fetch('/api/posts');
        return {
          ok: response.ok,
          cacheHeader: response.headers.get('x-cache'),
        };
      });
      
      // 2回目はキャッシュから返されることを期待
      expect(secondResponse.cacheHeader).toBe('HIT');
    });
  });

  test.describe('レンダリングパフォーマンス', () => {
    test('First Paint が高速である', async ({ page }) => {
      const paintTimings = await page.evaluate(() => {
        return new Promise((resolve) => {
          if (document.readyState === 'complete') {
            const paintMetrics = performance.getEntriesByType('paint');
            resolve(paintMetrics);
          } else {
            window.addEventListener('load', () => {
              const paintMetrics = performance.getEntriesByType('paint');
              resolve(paintMetrics);
            });
          }
        });
      });
      
      const firstPaint = (paintTimings as any[]).find(timing => timing.name === 'first-paint');
      const firstContentfulPaint = (paintTimings as any[]).find(timing => timing.name === 'first-contentful-paint');
      
      expect(firstPaint.startTime).toBeLessThan(1000); // 1秒以内
      expect(firstContentfulPaint.startTime).toBeLessThan(WEB_VITALS_THRESHOLDS.FCP);
    });

    test('スケルトンローダーが表示される', async ({ page }) => {
      // ネットワークを遅くして、スケルトンローダーを確認しやすくする
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100);
      });
      
      await page.goto('/');
      
      // スケルトンローダーが表示されることを確認
      const skeleton = await page.locator('.skeleton, .animate-pulse').first();
      await expect(skeleton).toBeVisible();
      
      // コンテンツがロードされるとスケルトンが消えることを確認
      await page.waitForLoadState('networkidle');
      await expect(skeleton).not.toBeVisible();
    });
  });
});

// パフォーマンス監視用のヘルパー関数
export async function measurePageLoad(page: Page, url: string) {
  const metrics = {
    startTime: Date.now(),
    endTime: 0,
    duration: 0,
    vitals: {} as any,
    resources: [] as any[],
  };

  await page.goto(url);
  await page.waitForLoadState('networkidle');
  
  metrics.endTime = Date.now();
  metrics.duration = metrics.endTime - metrics.startTime;
  metrics.vitals = await collectWebVitals(page);
  
  const resourceMetrics = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map((entry: any) => ({
      name: entry.name,
      duration: entry.duration,
      size: entry.transferSize || 0,
      type: entry.initiatorType,
    }));
  });
  
  metrics.resources = resourceMetrics;
  
  return metrics;
}
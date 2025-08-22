import dynamic from 'next/dynamic';
import { ComponentType, lazy, LazyExoticComponent, Suspense } from 'react';

// 動的インポートのオプション型
interface DynamicImportOptions {
  ssr?: boolean;
  loading?: ComponentType;
  suspense?: boolean;
}

// コンポーネントのプリロード管理
class ComponentPreloader {
  private static preloadedComponents = new Map<string, Promise<any>>();

  static preload(componentName: string, importFn: () => Promise<any>): void {
    if (!this.preloadedComponents.has(componentName)) {
      this.preloadedComponents.set(componentName, importFn());
    }
  }

  static getPreloaded(componentName: string): Promise<any> | undefined {
    return this.preloadedComponents.get(componentName);
  }
}

/**
 * 最適化された動的インポートラッパー
 */
export function optimizedDynamic<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: DynamicImportOptions = {}
): ComponentType<P> {
  const { ssr = true, loading: LoadingComponent, suspense = false } = options;

  if (suspense) {
    // React.lazy を使用（Suspense 対応）
    return lazy(importFn) as ComponentType<P>;
  }

  // Next.js dynamic を使用
  return dynamic(importFn, {
    ssr,
    loading: LoadingComponent,
  });
}

/**
 * ルートベースのコード分割設定
 */
export const routeCodeSplitting = {
  // 認証関連のコンポーネント
  auth: {
    LoginForm: () => optimizedDynamic(
      () => import('@/components/auth/LoginForm'),
      { ssr: false }
    ),
    RegisterForm: () => optimizedDynamic(
      () => import('@/components/auth/RegisterForm'),
      { ssr: false }
    ),
  },
  
  // 投稿関連のコンポーネント
  posts: {
    PostEditor: () => optimizedDynamic(
      () => import('@/components/posts/PostEditor'),
      { ssr: false }
    ),
    PostDetail: () => optimizedDynamic(
      () => import('@/components/posts/PostDetail'),
      { ssr: true }
    ),
  },
  
  // ダッシュボード関連
  dashboard: {
    Analytics: () => optimizedDynamic(
      () => import('@/components/dashboard/Analytics'),
      { ssr: false }
    ),
    Settings: () => optimizedDynamic(
      () => import('@/components/dashboard/Settings'),
      { ssr: false }
    ),
  },
};

/**
 * コンポーネントのプリロード関数
 */
export function preloadComponent(componentPath: string): void {
  const importMap: Record<string, () => Promise<any>> = {
    'ImageUploader': () => import('@/components/ImageUploader'),
    'HashtagDashboard': () => import('@/components/HashtagDashboard'),
    'NotificationBell': () => import('@/components/NotificationBell'),
    'UserSearch': () => import('@/components/UserSearch'),
    'CommentSection': () => import('@/components/CommentSection'),
  };

  const importFn = importMap[componentPath];
  if (importFn) {
    ComponentPreloader.preload(componentPath, importFn);
  }
}

/**
 * インタラクション時のプリロード
 */
export function preloadOnInteraction(
  elementId: string,
  componentPath: string
): void {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) return;

  const events = ['mouseenter', 'touchstart', 'focus'];
  const handler = () => {
    preloadComponent(componentPath);
    events.forEach(event => element.removeEventListener(event, handler));
  };

  events.forEach(event => element.addEventListener(event, handler));
}

/**
 * ビューポート内に入った時のプリロード
 */
export function preloadOnViewport(
  elementId: string,
  componentPath: string,
  rootMargin: string = '50px'
): void {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

  const element = document.getElementById(elementId);
  if (!element) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          preloadComponent(componentPath);
          observer.disconnect();
        }
      });
    },
    { rootMargin }
  );

  observer.observe(element);
}

/**
 * ネットワークアイドル時のプリロード
 */
export function preloadOnIdle(componentPaths: string[]): void {
  if (typeof window === 'undefined') return;

  const preloadFn = () => {
    componentPaths.forEach(path => preloadComponent(path));
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(preloadFn, { timeout: 2000 });
  } else {
    // フォールバック
    setTimeout(preloadFn, 2000);
  }
}

/**
 * チャンク最適化の設定を生成
 */
export function generateChunkOptimization() {
  return {
    splitChunks: {
      chunks: 'all' as const,
      cacheGroups: {
        // React 関連
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react',
          priority: 30,
        },
        // UI ライブラリ
        ui: {
          test: /[\\/]node_modules[\\/](@mui|@emotion|framer-motion)[\\/]/,
          name: 'ui',
          priority: 25,
        },
        // ユーティリティ
        utils: {
          test: /[\\/]node_modules[\\/](lodash|date-fns|uuid)[\\/]/,
          name: 'utils',
          priority: 20,
        },
        // 共通ベンダー
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          priority: 10,
        },
        // 共通コンポーネント
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
        // デフォルト
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    // ランタイムチャンクの分離
    runtimeChunk: {
      name: 'runtime',
    },
  };
}

/**
 * Webpack 最適化プラグインの設定
 */
export function getWebpackOptimizationPlugins() {
  return {
    minimizer: {
      // Terser プラグインの設定
      terserOptions: {
        compress: {
          drop_console: process.env.NODE_ENV === 'production',
          drop_debugger: true,
          pure_funcs: ['console.log', 'console.info'],
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      },
      extractComments: false,
    },
    // モジュール ID の最適化
    moduleIds: 'deterministic' as const,
    // チャンク ID の最適化
    chunkIds: 'deterministic' as const,
  };
}

/**
 * バンドルサイズ分析用の設定
 */
export function getBundleAnalyzerConfig() {
  return {
    enabled: process.env.ANALYZE === 'true',
    config: {
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'bundle-stats.json',
    },
  };
}

/**
 * 優先的にロードすべきリソースのヒント
 */
export function generateResourceHints(resources: {
  preconnect?: string[];
  dns_prefetch?: string[];
  preload?: { href: string; as: string; type?: string }[];
  prefetch?: string[];
}): string[] {
  const hints: string[] = [];

  // Preconnect
  resources.preconnect?.forEach(url => {
    hints.push(`<link rel="preconnect" href="${url}" crossorigin>`);
  });

  // DNS Prefetch
  resources.dns_prefetch?.forEach(url => {
    hints.push(`<link rel="dns-prefetch" href="${url}">`);
  });

  // Preload
  resources.preload?.forEach(({ href, as, type }) => {
    const typeAttr = type ? ` type="${type}"` : '';
    hints.push(`<link rel="preload" href="${href}" as="${as}"${typeAttr}>`);
  });

  // Prefetch
  resources.prefetch?.forEach(url => {
    hints.push(`<link rel="prefetch" href="${url}">`);
  });

  return hints;
}

/**
 * Critical CSS のインライン化
 */
export function inlineCriticalCSS(css: string): string {
  return `<style id="critical-css">${css}</style>`;
}

/**
 * 非同期スクリプトローダー
 */
export function loadScriptAsync(src: string, attributes?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    // 追加属性の設定
    if (attributes) {
      Object.entries(attributes).forEach(([key, value]) => {
        script.setAttribute(key, value);
      });
    }

    script.onload = () => resolve();
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

/**
 * パフォーマンスメトリクスの追跡
 */
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark) || 0;
    const end = endMark ? (this.marks.get(endMark) || performance.now()) : performance.now();
    const duration = end - start;

    // パフォーマンスエントリの作成
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        console.warn('Performance measurement failed:', e);
      }
    }

    return duration;
  }

  getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    if ('performance' in window) {
      const entries = performance.getEntriesByType('measure');
      entries.forEach(entry => {
        metrics[entry.name] = entry.duration;
      });
    }

    return metrics;
  }

  clear(): void {
    this.marks.clear();
    if ('performance' in window && 'clearMeasures' in performance) {
      performance.clearMeasures();
    }
  }
}

// グローバルトラッカーインスタンス
export const perfTracker = new PerformanceTracker();
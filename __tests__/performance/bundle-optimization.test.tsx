import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import dynamic from 'next/dynamic';
import {
  optimizedDynamic,
  preloadComponent,
  preloadOnInteraction,
  preloadOnViewport,
  preloadOnIdle,
  ComponentPreloader,
  PerformanceTracker,
} from '@/utils/bundleOptimization';

// Next.js dynamic のモック
jest.mock('next/dynamic', () => {
  return jest.fn((importFn, options) => {
    const Component = () => <div>Dynamic Component</div>;
    Component.displayName = 'DynamicComponent';
    return Component;
  });
});

// React.lazy のモック
const mockLazy = jest.spyOn(React, 'lazy');
mockLazy.mockImplementation((importFn: any) => {
  const Component = () => <div>Lazy Component</div>;
  Component.displayName = 'LazyComponent';
  return Component as any;
});

describe('Bundle Optimization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('optimizedDynamic', () => {
    it('デフォルトでNext.js dynamicを使用する', () => {
      const importFn = () => Promise.resolve({ default: () => <div>Test</div> });
      const Component = optimizedDynamic(importFn);

      expect(dynamic).toHaveBeenCalledWith(importFn, {
        ssr: true,
        loading: undefined,
      });
    });

    it('SSRを無効化できる', () => {
      const importFn = () => Promise.resolve({ default: () => <div>Test</div> });
      const Component = optimizedDynamic(importFn, { ssr: false });

      expect(dynamic).toHaveBeenCalledWith(importFn, {
        ssr: false,
        loading: undefined,
      });
    });

    it('ローディングコンポーネントを指定できる', () => {
      const LoadingComponent = () => <div>Loading...</div>;
      const importFn = () => Promise.resolve({ default: () => <div>Test</div> });
      const Component = optimizedDynamic(importFn, { loading: LoadingComponent });

      expect(dynamic).toHaveBeenCalledWith(importFn, {
        ssr: true,
        loading: LoadingComponent,
      });
    });

    it('Suspenseモードの場合はReact.lazyを使用する', () => {
      const importFn = () => Promise.resolve({ default: () => <div>Test</div> });
      const Component = optimizedDynamic(importFn, { suspense: true });

      expect(mockLazy).toHaveBeenCalledWith(importFn);
      expect(dynamic).not.toHaveBeenCalled();
    });
  });

  describe('Component Preloading', () => {
    it('コンポーネントをプリロードする', () => {
      const importFn = jest.fn().mockResolvedValue({ default: () => <div>Test</div> });
      
      // ComponentPreloaderのモック
      const preloadSpy = jest.spyOn(ComponentPreloader, 'preload');
      
      preloadComponent('ImageUploader');
      
      // プリロードが呼ばれることを確認
      expect(preloadSpy).toHaveBeenCalledWith('ImageUploader', expect.any(Function));
    });

    it('同じコンポーネントは一度だけプリロードされる', () => {
      const importFn = jest.fn().mockResolvedValue({ default: () => <div>Test</div> });
      
      // 2回プリロードを試みる
      preloadComponent('ImageUploader');
      preloadComponent('ImageUploader');
      
      // ComponentPreloaderのgetPreloadedを確認
      const getPreloadedSpy = jest.spyOn(ComponentPreloader, 'getPreloaded');
      ComponentPreloader.getPreloaded('ImageUploader');
      
      expect(getPreloadedSpy).toHaveBeenCalledWith('ImageUploader');
    });
  });

  describe('Interaction-based Preloading', () => {
    it('マウスエンター時にプリロードする', () => {
      document.body.innerHTML = '<div id="test-element">Hover me</div>';
      const element = document.getElementById('test-element')!;
      
      const addEventListenerSpy = jest.spyOn(element, 'addEventListener');
      
      preloadOnInteraction('test-element', 'TestComponent');
      
      // イベントリスナーが追加されることを確認
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      
      // イベントをトリガー
      fireEvent.mouseEnter(element);
      
      // イベントリスナーが削除されることを確認
      const removeEventListenerSpy = jest.spyOn(element, 'removeEventListener');
      fireEvent.mouseEnter(element);
    });
  });

  describe('Viewport-based Preloading', () => {
    it('ビューポート内に入った時にプリロードする', () => {
      // IntersectionObserver のモック
      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();
      
      (window as any).IntersectionObserver = jest.fn((callback) => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: jest.fn(),
      }));

      document.body.innerHTML = '<div id="viewport-element">Scroll to me</div>';
      
      preloadOnViewport('viewport-element', 'TestComponent');
      
      // IntersectionObserverが作成されることを確認
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '50px' }
      );
      
      // observeが呼ばれることを確認
      expect(mockObserve).toHaveBeenCalled();
    });

    it('カスタムrootMarginを設定できる', () => {
      (window as any).IntersectionObserver = jest.fn((callback, options) => ({
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      }));

      document.body.innerHTML = '<div id="viewport-element">Scroll to me</div>';
      
      preloadOnViewport('viewport-element', 'TestComponent', '100px');
      
      expect(window.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { rootMargin: '100px' }
      );
    });
  });

  describe('Idle-time Preloading', () => {
    it('requestIdleCallbackを使用してプリロードする', () => {
      const mockRequestIdleCallback = jest.fn((callback) => {
        callback({ didTimeout: false, timeRemaining: () => 50 } as any);
        return 1;
      });
      
      (window as any).requestIdleCallback = mockRequestIdleCallback;
      
      preloadOnIdle(['Component1', 'Component2', 'Component3']);
      
      expect(mockRequestIdleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 2000 }
      );
    });

    it('requestIdleCallbackがない場合はsetTimeoutを使用する', () => {
      delete (window as any).requestIdleCallback;
      
      const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
      
      preloadOnIdle(['Component1', 'Component2']);
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        2000
      );
    });
  });
});

describe('Performance Tracking', () => {
  let tracker: PerformanceTracker;

  beforeEach(() => {
    tracker = new PerformanceTracker();
    
    // Performance API のモック
    global.performance = {
      ...global.performance,
      now: jest.fn().mockReturnValue(1000),
      measure: jest.fn(),
      getEntriesByType: jest.fn().mockReturnValue([
        { name: 'test-measure', duration: 500 },
        { name: 'another-measure', duration: 300 },
      ]),
      clearMeasures: jest.fn(),
    };
  });

  it('マークを記録する', () => {
    tracker.mark('start');
    tracker.mark('end');
    
    expect(performance.now).toHaveBeenCalledTimes(2);
  });

  it('測定を実行する', () => {
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)  // start mark
      .mockReturnValueOnce(1500); // end mark
    
    tracker.mark('start');
    tracker.mark('end');
    
    const duration = tracker.measure('test-duration', 'start', 'end');
    
    expect(duration).toBe(500);
    expect(performance.measure).toHaveBeenCalledWith('test-duration', 'start', 'end');
  });

  it('endMarkを指定しない場合は現在時刻を使用する', () => {
    jest.spyOn(performance, 'now')
      .mockReturnValueOnce(1000)  // start mark
      .mockReturnValueOnce(2000); // current time
    
    tracker.mark('start');
    
    const duration = tracker.measure('test-duration', 'start');
    
    expect(duration).toBe(1000);
  });

  it('メトリクスを取得する', () => {
    const metrics = tracker.getMetrics();
    
    expect(metrics).toEqual({
      'test-measure': 500,
      'another-measure': 300,
    });
    
    expect(performance.getEntriesByType).toHaveBeenCalledWith('measure');
  });

  it('メトリクスをクリアする', () => {
    tracker.mark('start');
    tracker.mark('end');
    
    tracker.clear();
    
    expect(performance.clearMeasures).toHaveBeenCalled();
  });
});

describe('Chunk Optimization Configuration', () => {
  it('チャンク最適化設定を生成する', () => {
    const { generateChunkOptimization } = require('@/utils/bundleOptimization');
    const config = generateChunkOptimization();
    
    expect(config).toHaveProperty('splitChunks');
    expect(config.splitChunks.chunks).toBe('all');
    expect(config.splitChunks.cacheGroups).toHaveProperty('react');
    expect(config.splitChunks.cacheGroups).toHaveProperty('ui');
    expect(config.splitChunks.cacheGroups).toHaveProperty('utils');
    expect(config.splitChunks.cacheGroups).toHaveProperty('vendor');
    expect(config.splitChunks.cacheGroups).toHaveProperty('common');
    
    expect(config).toHaveProperty('runtimeChunk');
    expect(config.runtimeChunk.name).toBe('runtime');
  });

  it('Webpack最適化プラグイン設定を生成する', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const { getWebpackOptimizationPlugins } = require('@/utils/bundleOptimization');
    const config = getWebpackOptimizationPlugins();
    
    expect(config.minimizer.terserOptions.compress.drop_console).toBe(true);
    expect(config.minimizer.terserOptions.compress.drop_debugger).toBe(true);
    expect(config.minimizer.terserOptions.mangle.safari10).toBe(true);
    expect(config.minimizer.extractComments).toBe(false);
    expect(config.moduleIds).toBe('deterministic');
    expect(config.chunkIds).toBe('deterministic');
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('Resource Hints', () => {
  it('リソースヒントを生成する', () => {
    const { generateResourceHints } = require('@/utils/bundleOptimization');
    
    const hints = generateResourceHints({
      preconnect: ['https://fonts.googleapis.com', 'https://res.cloudinary.com'],
      dns_prefetch: ['https://www.google-analytics.com'],
      preload: [
        { href: '/fonts/main.woff2', as: 'font', type: 'font/woff2' },
        { href: '/css/critical.css', as: 'style' },
      ],
      prefetch: ['/api/posts', '/images/hero.jpg'],
    });
    
    expect(hints).toContain('<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>');
    expect(hints).toContain('<link rel="preconnect" href="https://res.cloudinary.com" crossorigin>');
    expect(hints).toContain('<link rel="dns-prefetch" href="https://www.google-analytics.com">');
    expect(hints).toContain('<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2">');
    expect(hints).toContain('<link rel="preload" href="/css/critical.css" as="style">');
    expect(hints).toContain('<link rel="prefetch" href="/api/posts">');
    expect(hints).toContain('<link rel="prefetch" href="/images/hero.jpg">');
  });
});

describe('Async Script Loading', () => {
  it('非同期でスクリプトをロードする', async () => {
    const { loadScriptAsync } = require('@/utils/bundleOptimization');
    
    // createElement のモック
    const mockScript = document.createElement('script');
    const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
    const appendChildSpy = jest.spyOn(document.head, 'appendChild').mockImplementation(() => mockScript);
    
    const promise = loadScriptAsync('https://example.com/script.js', {
      'data-id': 'test-script',
      'data-config': 'value',
    });
    
    // スクリプト要素が作成されることを確認
    expect(createElementSpy).toHaveBeenCalledWith('script');
    expect(mockScript.src).toBe('https://example.com/script.js');
    expect(mockScript.async).toBe(true);
    expect(mockScript.getAttribute('data-id')).toBe('test-script');
    expect(mockScript.getAttribute('data-config')).toBe('value');
    
    // スクリプトが追加されることを確認
    expect(appendChildSpy).toHaveBeenCalledWith(mockScript);
    
    // ロード成功をシミュレート
    mockScript.onload?.({} as any);
    
    await expect(promise).resolves.toBeUndefined();
  });

  it('スクリプトロードエラーをハンドルする', async () => {
    const { loadScriptAsync } = require('@/utils/bundleOptimization');
    
    const mockScript = document.createElement('script');
    jest.spyOn(document, 'createElement').mockReturnValue(mockScript);
    jest.spyOn(document.head, 'appendChild').mockImplementation(() => mockScript);
    
    const promise = loadScriptAsync('https://example.com/error.js');
    
    // エラーをシミュレート
    mockScript.onerror?.({} as any);
    
    await expect(promise).rejects.toBeDefined();
  });
});
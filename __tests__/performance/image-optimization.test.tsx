import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import OptimizedImage from '@/components/OptimizedImage';
import { getOptimizedImageUrl, generateSrcSet, getBlurDataUrl } from '@/utils/imageOptimization';

// Intersection Observer のモック
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver as any;

// Next.js Image コンポーネントのモック
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />;
  },
}));

describe('OptimizedImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('画像の遅延読み込み', () => {
    it('初期状態では画像がロードされない', () => {
      const { container } = render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test Image"
          enableLazyLoad={true}
        />
      );

      // IntersectionObserver が呼ばれることを確認
      expect(mockIntersectionObserver).toHaveBeenCalled();

      // 画像がまだレンダリングされていないことを確認
      const img = container.querySelector('img');
      expect(img).toBeNull();
    });

    it('ビューポートに入ると画像がロードされる', async () => {
      let intersectionCallback: IntersectionObserverCallback | null = null;

      mockIntersectionObserver.mockImplementation((callback) => {
        intersectionCallback = callback;
        return {
          observe: jest.fn(),
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      const { container } = render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test Image"
          enableLazyLoad={true}
        />
      );

      // IntersectionObserver のコールバックを手動でトリガー
      act(() => {
        if (intersectionCallback) {
          intersectionCallback(
            [{ isIntersecting: true, target: container.firstChild }] as any,
            {} as any
          );
        }
      });

      // 画像がレンダリングされることを確認
      await waitFor(() => {
        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', '/test-image.jpg');
      });
    });

    it('priority=true の場合は即座にロードされる', () => {
      const { container } = render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test Image"
          priority={true}
        />
      );

      // 画像が即座にレンダリングされることを確認
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('loading', 'eager');
    });
  });

  describe('スケルトンローダー', () => {
    it('画像ロード中にスケルトンが表示される', () => {
      const { container } = render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test Image"
          showSkeleton={true}
          priority={true}
        />
      );

      // スケルトンローダーが表示されることを確認
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('画像ロード完了後にスケルトンが非表示になる', async () => {
      const { container } = render(
        <OptimizedImage
          src="/test-image.jpg"
          alt="Test Image"
          showSkeleton={true}
          priority={true}
        />
      );

      const img = container.querySelector('img') as HTMLImageElement;
      
      // 画像のロード完了をシミュレート
      act(() => {
        fireEvent.load(img);
      });

      await waitFor(() => {
        const skeleton = container.querySelector('.animate-pulse');
        expect(skeleton).not.toBeInTheDocument();
        expect(img).toHaveClass('opacity-100');
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('画像ロードエラー時にフォールバックが表示される', async () => {
      const { container } = render(
        <OptimizedImage
          src="/invalid-image.jpg"
          alt="Test Image"
          priority={true}
        />
      );

      const img = container.querySelector('img') as HTMLImageElement;
      
      // エラーをシミュレート
      act(() => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        // エラーメッセージが表示されることを確認
        expect(screen.getByText('画像を読み込めませんでした')).toBeInTheDocument();
        // SVGアイコンが表示されることを確認
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('onError コールバックが呼ばれる', async () => {
      const onError = jest.fn();
      
      const { container } = render(
        <OptimizedImage
          src="/invalid-image.jpg"
          alt="Test Image"
          priority={true}
          onError={onError}
        />
      );

      const img = container.querySelector('img') as HTMLImageElement;
      
      act(() => {
        fireEvent.error(img);
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});

describe('Image Optimization Utilities', () => {
  describe('getOptimizedImageUrl', () => {
    it('サムネイル用の最適化URLを生成する', () => {
      const url = getOptimizedImageUrl('test-image', 'thumbnail');
      
      expect(url).toContain('w_150');
      expect(url).toContain('h_150');
      expect(url).toContain('c_fill');
      expect(url).toContain('q_auto:low');
      expect(url).toContain('f_auto');
    });

    it('中サイズ画像用の最適化URLを生成する', () => {
      const url = getOptimizedImageUrl('test-image', 'medium');
      
      expect(url).toContain('w_800');
      expect(url).toContain('h_800');
      expect(url).toContain('c_limit');
      expect(url).toContain('q_auto:good');
      expect(url).toContain('f_auto');
    });

    it('大サイズ画像用の最適化URLを生成する', () => {
      const url = getOptimizedImageUrl('test-image', 'large');
      
      expect(url).toContain('w_1920');
      expect(url).toContain('h_1080');
      expect(url).toContain('c_limit');
      expect(url).toContain('q_auto:best');
      expect(url).toContain('f_auto');
    });

    it('追加オプションを適用する', () => {
      const url = getOptimizedImageUrl('test-image', 'medium', {
        effect: 'blur:1000',
        radius: 10,
      });
      
      expect(url).toContain('e_blur:1000');
      expect(url).toContain('r_10');
    });
  });

  describe('generateSrcSet', () => {
    it('レスポンシブ画像のsrcSetを生成する', () => {
      const srcSet = generateSrcSet('test-image');
      
      expect(srcSet).toContain('320w');
      expect(srcSet).toContain('640w');
      expect(srcSet).toContain('768w');
      expect(srcSet).toContain('1024w');
      expect(srcSet).toContain('1280w');
      expect(srcSet).toContain('1920w');
    });

    it('カスタムサイズでsrcSetを生成する', () => {
      const srcSet = generateSrcSet('test-image', [480, 960, 1440]);
      
      expect(srcSet).toContain('480w');
      expect(srcSet).toContain('960w');
      expect(srcSet).toContain('1440w');
      expect(srcSet).not.toContain('320w');
    });
  });

  describe('getBlurDataUrl', () => {
    it('Blur データURLを生成する', async () => {
      // fetch のモック
      global.fetch = jest.fn().mockResolvedValue({
        blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
      });

      const blurUrl = await getBlurDataUrl('test-image');
      
      expect(blurUrl).toContain('data:image/jpeg;base64,');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('w_20')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('h_20')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('q_10')
      );
    });

    it('エラー時にデフォルトのBlur URLを返す', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const blurUrl = await getBlurDataUrl('test-image');
      
      // デフォルトのBase64文字列が返されることを確認
      expect(blurUrl).toContain('data:image/jpeg;base64,/9j/');
    });
  });
});

describe('Performance Metrics', () => {
  beforeEach(() => {
    // Performance API のモック
    global.performance = {
      ...global.performance,
      mark: jest.fn(),
      measure: jest.fn(),
      now: jest.fn().mockReturnValue(1000),
    };

    // Google Analytics のモック
    (window as any).gtag = jest.fn();
  });

  it('画像のパフォーマンスメトリクスを記録する', () => {
    const { trackImagePerformance } = require('@/utils/imageOptimization');
    
    trackImagePerformance('test-image', 500);

    // Performance API が呼ばれることを確認
    expect(performance.mark).toHaveBeenCalledWith('image-loaded-test-image');
    expect(performance.measure).toHaveBeenCalledWith(
      'image-load-time-test-image',
      'image-start-test-image',
      'image-loaded-test-image'
    );

    // Google Analytics に送信されることを確認
    expect((window as any).gtag).toHaveBeenCalledWith('event', 'timing_complete', {
      name: 'image_load',
      value: 500,
      event_category: 'Image Performance',
      event_label: 'test-image',
    });
  });
});
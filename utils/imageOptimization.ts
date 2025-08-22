// Cloudinary の設定（サーバーサイドのみ）
let cloudinary: any = null;
if (typeof window === 'undefined') {
  const { v2 } = require('cloudinary');
  cloudinary = v2;
  
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

// ビューポートタイプ
export type Viewport = 'mobile' | 'tablet' | 'desktop';
export type TransformationType = 'thumbnail' | 'medium' | 'large' | 'original';

// 画像変換設定
const TRANSFORMATION_PRESETS = {
  thumbnail: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto:low',
    format: 'auto',
    flags: 'progressive',
  },
  medium: {
    width: 800,
    height: 800,
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto',
    flags: 'progressive',
  },
  large: {
    width: 1920,
    height: 1080,
    crop: 'limit',
    quality: 'auto:best',
    format: 'auto',
    flags: 'progressive',
  },
  original: {
    quality: 'auto:best',
    format: 'auto',
    flags: 'progressive',
  },
};

// デバイス別の画像サイズ設定
const VIEWPORT_SIZES = {
  mobile: { maxWidth: 640, quality: 'auto:low' },
  tablet: { maxWidth: 1024, quality: 'auto:good' },
  desktop: { maxWidth: 1920, quality: 'auto:best' },
};

/**
 * Cloudinary の最適化された画像 URL を生成
 */
export function getOptimizedImageUrl(
  publicId: string,
  transformation: TransformationType = 'medium',
  additionalOptions?: Record<string, any>
): string {
  // クライアントサイドでは簡易的なURL生成
  if (typeof window !== 'undefined' || !cloudinary) {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
    const preset = TRANSFORMATION_PRESETS[transformation];
    const params = new URLSearchParams();
    
    if (preset.width) params.append('w', preset.width.toString());
    if (preset.height) params.append('h', preset.height.toString());
    if (preset.crop) params.append('c', preset.crop);
    if (preset.quality) params.append('q', preset.quality);
    params.append('f', 'auto');
    
    return `https://res.cloudinary.com/${cloudName}/image/upload/${params.toString()}/${publicId}`;
  }

  const baseTransformation = TRANSFORMATION_PRESETS[transformation];
  const transformations = {
    ...baseTransformation,
    ...additionalOptions,
    fetch_format: 'auto', // WebP/AVIF 自動変換
    dpr: 'auto', // デバイスピクセル比対応
  };

  return cloudinary.url(publicId, {
    transformation: transformations,
    secure: true,
  });
}

/**
 * レスポンシブ画像の srcSet を生成
 */
export function generateSrcSet(
  publicId: string,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1536, 1920]
): string {
  return sizes
    .map((size) => {
      const url = cloudinary.url(publicId, {
        transformation: {
          width: size,
          crop: 'limit',
          quality: 'auto',
          format: 'auto',
        },
        secure: true,
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

/**
 * ビューポートに基づく最適化 URL を取得
 */
export function getViewportOptimizedUrl(
  publicId: string,
  viewport: Viewport
): string {
  const settings = VIEWPORT_SIZES[viewport];
  
  return cloudinary.url(publicId, {
    transformation: {
      width: settings.maxWidth,
      crop: 'limit',
      quality: settings.quality,
      format: 'auto',
      flags: 'progressive',
    },
    secure: true,
  });
}

/**
 * Blur データ URL を生成（プレースホルダー用）
 */
export async function getBlurDataUrl(publicId: string): Promise<string> {
  const url = cloudinary.url(publicId, {
    transformation: {
      width: 20,
      height: 20,
      crop: 'fill',
      quality: 10,
      effect: 'blur:1000',
      format: 'jpg',
    },
    secure: true,
  });

  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Error generating blur data URL:', error);
    // デフォルトの blur データ URL を返す
    return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
  }
}

/**
 * 画像の最適化オプションを取得
 */
export function getImageOptimizationOptions(
  contentType: string,
  isHeroImage: boolean = false
): Record<string, any> {
  const baseOptions = {
    format: 'auto',
    quality: 'auto',
    flags: ['progressive', 'immutable_cache'],
  };

  if (isHeroImage) {
    return {
      ...baseOptions,
      quality: 'auto:best',
      fetch_format: 'auto',
      width: 1920,
      height: 1080,
      crop: 'limit',
    };
  }

  // コンテンツタイプに基づく最適化
  switch (contentType) {
    case 'avatar':
      return {
        ...baseOptions,
        width: 200,
        height: 200,
        crop: 'fill',
        gravity: 'face',
        radius: 'max',
      };
    case 'post':
      return {
        ...baseOptions,
        width: 1200,
        crop: 'limit',
        quality: 'auto:good',
      };
    case 'thumbnail':
      return {
        ...baseOptions,
        width: 400,
        height: 300,
        crop: 'fill',
        gravity: 'auto',
        quality: 'auto:eco',
      };
    default:
      return baseOptions;
  }
}

/**
 * 画像アップロード時の最適化処理
 */
export async function optimizeImageOnUpload(
  file: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    tags?: string[];
    contentType?: string;
  } = {}
): Promise<any> {
  const uploadOptions = {
    folder: options.folder || 'board-app',
    public_id: options.publicId,
    tags: options.tags,
    resource_type: 'image' as const,
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { flags: 'progressive' },
    ],
    eager: [
      // 事前に生成する変換
      { width: 150, height: 150, crop: 'fill', format: 'auto' }, // サムネイル
      { width: 800, crop: 'limit', format: 'auto' }, // 中サイズ
    ],
    eager_async: true,
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(file);
  });
}

/**
 * 画像のプリロードタグを生成
 */
export function generateImagePreloadTags(publicIds: string[]): string[] {
  return publicIds.map((publicId) => {
    const url = getOptimizedImageUrl(publicId, 'medium');
    return `<link rel="preload" as="image" href="${url}" type="image/webp">`;
  });
}

/**
 * Critical CSS for above-the-fold images
 */
export function getCriticalImageStyles(): string {
  return `
    .optimized-image-container {
      position: relative;
      overflow: hidden;
      background-color: #f3f4f6;
    }
    
    .optimized-image-container img {
      transition: opacity 0.3s ease-in-out;
    }
    
    .optimized-image-skeleton {
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    .image-error-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f9fafb;
      color: #9ca3af;
    }
  `;
}

/**
 * パフォーマンスメトリクスの記録
 */
export function trackImagePerformance(imageName: string, startTime: number): void {
  const loadTime = performance.now() - startTime;
  
  // パフォーマンスエントリの記録
  if ('PerformanceObserver' in window) {
    performance.mark(`image-loaded-${imageName}`);
    performance.measure(
      `image-load-time-${imageName}`,
      `image-start-${imageName}`,
      `image-loaded-${imageName}`
    );
  }

  // Analytics への送信（Google Analytics の例）
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'timing_complete', {
      name: 'image_load',
      value: Math.round(loadTime),
      event_category: 'Image Performance',
      event_label: imageName,
    });
  }

  // コンソールログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`Image ${imageName} loaded in ${loadTime.toFixed(2)}ms`);
  }
}
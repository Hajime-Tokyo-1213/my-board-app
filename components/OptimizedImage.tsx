'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { getOptimizedImageUrl, getBlurDataUrl } from '@/utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  publicId?: string; // Cloudinary public ID
  transformation?: 'thumbnail' | 'medium' | 'large' | 'original';
  aspectRatio?: string; // e.g., "16/9", "4/3", "1/1"
  enableLazyLoad?: boolean;
  showSkeleton?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  objectFit = 'cover',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError,
  publicId,
  transformation = 'medium',
  aspectRatio = '16/9',
  enableLazyLoad = true,
  showSkeleton = true,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(!enableLazyLoad);
  const [blurDataUrl, setBlurDataUrl] = useState<string>('');
  const imageRef = useRef<HTMLDivElement>(null);

  // Cloudinary URL の生成
  const imageUrl = publicId 
    ? getOptimizedImageUrl(publicId, transformation)
    : src;

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!enableLazyLoad || !imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.01,
      }
    );

    observer.observe(imageRef.current);

    return () => {
      observer.disconnect();
    };
  }, [enableLazyLoad]);

  // Generate blur data URL for placeholder
  useEffect(() => {
    if (publicId && showSkeleton) {
      getBlurDataUrl(publicId).then(setBlurDataUrl);
    }
  }, [publicId, showSkeleton]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setError(true);
    onError?.();
  };

  // アスペクト比に基づくコンテナスタイル
  const containerStyle = aspectRatio && !width && !height
    ? { aspectRatio, width: '100%', position: 'relative' as const }
    : width && height
    ? { width, height, position: 'relative' as const }
    : { position: 'relative' as const };

  // エラー時のフォールバック
  if (error) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <div className="text-gray-400 text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">画像を読み込めませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={imageRef} className={`relative overflow-hidden ${className}`} style={containerStyle}>
      {/* スケルトンローダー */}
      {showSkeleton && isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse">
          <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer" />
        </div>
      )}

      {/* 画像本体 */}
      {isInView && (
        <Image
          src={imageUrl}
          alt={alt}
          fill={!width && !height}
          width={width}
          height={height}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          placeholder={blurDataUrl ? 'blur' : 'empty'}
          blurDataURL={blurDataUrl}
          sizes={sizes}
          style={{ objectFit }}
          onLoad={handleLoad}
          onError={handleError}
          className={`${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          quality={85}
        />
      )}

      {/* プログレッシブローディングインジケーター */}
      {isLoading && !showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// メモ化されたコンポーネント for リスト表示
import React from 'react';
export const MemoizedOptimizedImage = React.memo(OptimizedImage);

// サムネイル用の軽量版
export function ThumbnailImage({
  src,
  alt,
  size = 48,
  className = '',
  publicId,
}: {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  publicId?: string;
}) {
  const imageUrl = publicId 
    ? getOptimizedImageUrl(publicId, 'thumbnail')
    : src;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes={`${size}px`}
        className="rounded-full object-cover"
        quality={70}
        loading="lazy"
      />
    </div>
  );
}

// ヒーロー画像用の最適化版
export function HeroImage({
  src,
  alt,
  className = '',
  publicId,
  height = 400,
}: {
  src: string;
  alt: string;
  className?: string;
  publicId?: string;
  height?: number;
}) {
  const imageUrl = publicId 
    ? getOptimizedImageUrl(publicId, 'large')
    : src;

  return (
    <div className={`relative w-full ${className}`} style={{ height }}>
      <Image
        src={imageUrl}
        alt={alt}
        fill
        priority
        sizes="100vw"
        className="object-cover"
        quality={90}
        placeholder="blur"
        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k="
      />
    </div>
  );
}
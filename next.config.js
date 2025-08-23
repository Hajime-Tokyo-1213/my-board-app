const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
        },
      },
    },
    {
      urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'cloudinary-cache',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
        },
      },
    },
    {
      urlPattern: /^\/api\/posts$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'api-posts',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5, // 5分
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60, // 1時間
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1年（immutable）
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30日
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ビルド時の型チェックを無視（Vercelビルド用）
    ignoreBuildErrors: true,
  },
  eslint: {
    // ビルド時のESLintを無視（Vercelビルド用）
    ignoreDuringBuilds: true,
  },
  
  // 画像最適化の設定
  images: {
    domains: ['res.cloudinary.com', 'cloudinary.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1年
  },

  // 実験的機能の有効化
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      'lodash',
      'date-fns',
      '@tanstack/react-query',
    ],
  },

  // Webpack 設定のカスタマイズ
  webpack: (config, { dev, isServer, webpack }) => {
    // 本番環境でのみバンドル最適化を適用
    if (!dev && !isServer) {
      // コード分割の最適化
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // React 関連
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            name: 'react',
            priority: 40,
            reuseExistingChunk: true,
          },
          // UI ライブラリ
          mui: {
            test: /[\\/]node_modules[\\/]@mui[\\/]/,
            name: 'mui',
            priority: 35,
          },
          // フレームワーク
          framework: {
            test: /[\\/]node_modules[\\/](next|@next)[\\/]/,
            name: 'framework',
            priority: 30,
          },
          // ユーティリティ
          utils: {
            test: /[\\/]node_modules[\\/](lodash|date-fns|uuid|zod)[\\/]/,
            name: 'utils',
            priority: 25,
          },
          // 共通ライブラリ
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name: 'lib',
            priority: 20,
            minChunks: 2,
          },
          // 共通コンポーネント
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 10,
          },
        },
      };

      // ランタイムチャンクを分離
      config.optimization.runtimeChunk = {
        name: 'runtime',
      };

      // モジュールIDの最適化
      config.optimization.moduleIds = 'deterministic';
      config.optimization.chunkIds = 'deterministic';

      // Webpack プラグインの追加
      config.plugins.push(
        new webpack.DefinePlugin({
          'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
        })
      );

      // パフォーマンス予算の設定
      config.performance = {
        maxEntrypointSize: 512000, // 500KB
        maxAssetSize: 512000, // 500KB
        hints: 'warning',
      };
    }

    // 開発環境での最適化
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },

  // HTTP ヘッダーの設定
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300',
          },
        ],
      },
    ];
  },

  // リダイレクトとリライトの設定
  async redirects() {
    return [];
  },

  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // 出力設定
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  
  // SWC Minifier の設定（Terser より高速）
};

// Bundle Analyzer の設定（必要に応じて）
if (process.env.ANALYZE === 'true') {
  const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: true,
    openAnalyzer: false,
  });
  module.exports = withBundleAnalyzer(withPWA(nextConfig));
} else {
  module.exports = withPWA(nextConfig);
}
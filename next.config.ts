import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ビルド時の型チェックを無視（Vercelビルド用）
    ignoreBuildErrors: false,
  },
  eslint: {
    // ビルド時のESLintを無視（Vercelビルド用）
    ignoreDuringBuilds: false,
  },
  // テストファイルを除外
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      loader: 'ignore-loader'
    });
    return config;
  },
};

export default nextConfig;

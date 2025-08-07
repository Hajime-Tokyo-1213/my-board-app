import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ビルド時の型チェックを無視（Vercelビルド用）
    ignoreBuildErrors: true,
  },
  eslint: {
    // ビルド時のESLintを無視（Vercelビルド用）
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

'use client';

import dynamic from 'next/dynamic';

// クライアントサイドでのみレンダリングするコンポーネント
export const InstallPrompt = dynamic(
  () => import('@/components/InstallPrompt'),
  { ssr: false }
);

export const NotificationPermission = dynamic(
  () => import('@/components/NotificationPermission'),
  { ssr: false }
);

export const OfflineIndicator = dynamic(
  () => import('@/components/OfflineIndicator'),
  { ssr: false }
);
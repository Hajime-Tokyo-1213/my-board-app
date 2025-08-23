'use client';

import dynamic from 'next/dynamic';

// クライアントサイドでのみレンダリングするコンポーネント
export const InstallPrompt = dynamic(
  () => import('./InstallPrompt'),
  { ssr: false }
);

export const NotificationPermission = dynamic(
  () => import('./NotificationPermission'),
  { ssr: false }
);

export const OfflineIndicator = dynamic(
  () => import('./OfflineIndicator'),
  { ssr: false }
);
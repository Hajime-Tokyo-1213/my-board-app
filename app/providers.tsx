'use client';

import { SessionProvider } from 'next-auth/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import ThemeRegistry from '@/src/app/registry';

export function Providers({ children }: { children: React.ReactNode }) {
  // QueryClientインスタンスを状態として保持（シングルトン）
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // データの再取得戦略
            staleTime: 1000 * 60, // 1分間は新鮮なデータとして扱う
            gcTime: 1000 * 60 * 5, // 5分間キャッシュを保持
            refetchOnWindowFocus: false, // フォーカス時の再取得を無効化
            refetchOnReconnect: 'always', // 再接続時は常に再取得
            retry: 3, // 失敗時のリトライ回数
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // リトライ間隔
          },
          mutations: {
            retry: 2, // ミューテーションのリトライ回数
          },
        },
      })
  );

  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}
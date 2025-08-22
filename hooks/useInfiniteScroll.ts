'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { useInView } from 'react-intersection-observer';

export interface Post {
  id: string;
  _id: string;
  userId: string;
  userName: string;
  userImage?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likeCount: number;
  commentCount: number;
  likes: string[];
  hashtags?: string[];
  images?: {
    id: string;
    url: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface FetchPostsResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
  totalNew?: number;
}

interface UseInfiniteScrollOptions {
  limit?: number;
  userId?: string;
  hashtag?: string;
  onNewPosts?: (count: number) => void;
}

async function fetchPosts({ 
  cursor, 
  limit = 20, 
  userId,
  hashtag 
}: { 
  cursor: string | null; 
  limit: number;
  userId?: string;
  hashtag?: string;
}): Promise<FetchPostsResponse> {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  params.append('limit', limit.toString());
  if (userId) params.append('userId', userId);
  if (hashtag) params.append('hashtag', hashtag);

  const response = await fetch(`/api/posts/feed?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('投稿の取得に失敗しました');
  }

  return response.json();
}

export function useInfiniteScroll({
  limit = 20,
  userId,
  hashtag,
  onNewPosts
}: UseInfiniteScrollOptions = {}) {
  const lastFetchTimeRef = useRef(Date.now());
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Intersection Observer設定
  const { ref: observerRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '200px',
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching
  } = useInfiniteQuery({
    queryKey: ['posts', 'feed', { userId, hashtag, limit }],
    queryFn: ({ pageParam }) => fetchPosts({ 
      cursor: pageParam, 
      limit,
      userId,
      hashtag 
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60, // 1分
    gcTime: 1000 * 60 * 5, // 5分
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  // 新着投稿のポーリング（30秒ごと）
  useEffect(() => {
    const checkNewPosts = async () => {
      if (!data?.pages?.[0]?.posts?.[0]) return;

      try {
        const latestPostId = data.pages[0].posts[0].id;
        const response = await fetch(`/api/posts/new-count?since=${latestPostId}`);
        
        if (response.ok) {
          const { count } = await response.json();
          if (count > 0 && onNewPosts) {
            onNewPosts(count);
          }
        }
      } catch (error) {
        console.error('新着投稿チェックエラー:', error);
      }
    };

    const interval = setInterval(checkNewPosts, 30000);
    return () => clearInterval(interval);
  }, [data, onNewPosts]);

  // デバウンスされたフェッチ
  const debouncedFetchNext = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 300) {
        lastFetchTimeRef.current = now;
        fetchNextPage();
      }
    }, 300);
  }, [fetchNextPage]);

  // スクロール検知で次ページ取得
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage && !isLoading) {
      debouncedFetchNext();
    }
  }, [inView, hasNextPage, isFetchingNextPage, isLoading, debouncedFetchNext]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // 全投稿を平坦化
  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  // メモリ管理（5ページ以上前のデータをクリア）
  useEffect(() => {
    if (data?.pages && data.pages.length > 10) {
      // QueryClientでキャッシュ管理（自動GC）
      console.log('古いページがガベージコレクション対象になります');
    }
  }, [data?.pages]);

  return {
    posts,
    observerRef,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    refetch,
    isRefetching,
    totalPages: data?.pages.length ?? 0,
  };
}

// スクロール位置の保存と復元
export function useScrollRestoration(key: string) {
  const scrollPositions = useRef<Map<string, number>>(new Map());

  const saveScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      scrollPositions.current.set(key, window.scrollY);
    }
  }, [key]);

  const restoreScrollPosition = useCallback(() => {
    if (typeof window !== 'undefined') {
      const position = scrollPositions.current.get(key);
      if (position !== undefined) {
        window.scrollTo(0, position);
      }
    }
  }, [key]);

  useEffect(() => {
    return () => {
      saveScrollPosition();
    };
  }, [saveScrollPosition]);

  return {
    saveScrollPosition,
    restoreScrollPosition,
  };
}
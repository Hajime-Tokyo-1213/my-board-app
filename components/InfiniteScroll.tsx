'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Snackbar,
  Paper,
  Skeleton,
  Typography,
  Fab,
  Zoom,
  Badge,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { useInfiniteScroll, useScrollRestoration, Post } from '@/hooks/useInfiniteScroll';
import TimelinePostCard from './TimelinePostCard';
import PostCard from './PostCard';

interface InfiniteScrollProps {
  userId?: string;
  hashtag?: string;
  enableVirtualization?: boolean;
  showTitle?: boolean;
  showPostCount?: boolean;
  usePostCard?: boolean; // PostCardを使用するかどうか
  onPostClick?: (post: Post) => void;
  onUserClick?: (userId: string) => void;
  onHashtagClick?: (hashtag: string) => void;
}

// ポストカードのスケルトン
function PostSkeleton() {
  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="30%" />
          <Skeleton variant="text" width="20%" sx={{ fontSize: '0.875rem' }} />
        </Box>
      </Box>
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="rectangular" height={200} sx={{ mt: 2, borderRadius: 1 }} />
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Skeleton variant="text" width={60} />
        <Skeleton variant="text" width={60} />
        <Skeleton variant="text" width={60} />
      </Box>
    </Paper>
  );
}

export default function InfiniteScroll({
  userId,
  hashtag,
  enableVirtualization = true,
  showTitle = false,
  showPostCount = false,
  usePostCard = false,
  onPostClick,
  onUserClick,
  onHashtagClick,
}: InfiniteScrollProps) {
  const { data: session } = useSession();
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 現在ログイン中のユーザーID
  const currentUserId = session?.user?.id;

  const {
    posts,
    observerRef,
    isLoading,
    isFetchingNextPage,
    isError,
    error,
    hasNextPage,
    refetch,
    isRefetching,
  } = useInfiniteScroll({
    userId,
    hashtag,
    limit: 20,
    onNewPosts: setNewPostsCount,
  });

  const { saveScrollPosition, restoreScrollPosition } = useScrollRestoration(
    `timeline-${userId || 'main'}-${hashtag || 'all'}`
  );

  // 投稿の高さを推定（コンテンツ長に基づく）
  const estimateHeight = useCallback((post: Post) => {
    const baseHeight = 200;
    const contentHeight = Math.ceil(post.content.length / 50) * 20;
    const hasMedia = post.imageUrl || post.videoUrl ? 300 : 0;
    return baseHeight + contentHeight + hasMedia;
  }, []);

  // 仮想スクロール設定
  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => estimateHeight(posts[index]),
    overscan: 5,
    enabled: enableVirtualization && posts.length > 50, // 50件以上で仮想スクロール有効化
  });

  // スクロール位置監視
  useEffect(() => {
    const handleScroll = () => {
      if (typeof window !== 'undefined') {
        setShowScrollTop(window.scrollY > 300);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 新着投稿読み込み
  const handleLoadNewPosts = useCallback(async () => {
    setNewPostsCount(0);
    await refetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [refetch]);

  // トップへスクロール
  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // 投稿削除処理
  const handleDelete = useCallback(async (postId: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // 削除成功時はデータを再取得
        await refetch();
        alert('投稿を削除しました');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert(error instanceof Error ? error.message : '投稿の削除に失敗しました');
    }
  }, [refetch]);

  // いいね処理
  const handleLike = useCallback(async (postId: string) => {
    // TimelinePostCard内で処理
  }, []);

  // 投稿更新処理 (PostCard用)
  const handleUpdate = useCallback(async (postId: string, title: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      if (response.ok) {
        await refetch();
        alert('投稿を更新しました');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新に失敗しました');
      }
    } catch (error) {
      console.error('更新エラー:', error);
      alert(error instanceof Error ? error.message : '投稿の更新に失敗しました');
    }
  }, [refetch]);

  // 仮想スクロール用のアイテム
  const virtualItems = virtualizer.getVirtualItems();

  // レンダリング内容
  const renderContent = () => {
    if (isLoading) {
      return (
        <Box>
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </Box>
      );
    }

    if (isError) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error instanceof Error ? error.message : '投稿の取得に失敗しました'}
          <Button onClick={() => refetch()} sx={{ ml: 2 }}>
            再試行
          </Button>
        </Alert>
      );
    }

    if (posts.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            投稿がまだありません
          </Typography>
        </Paper>
      );
    }

    // 仮想スクロール有効時
    if (enableVirtualization && posts.length > 50) {
      return (
        <div
          ref={parentRef}
          style={{
            height: '100vh',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const post = posts[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TimelinePostCard
                      id={post.id || post._id}
                      title={(post as any).title}
                      content={post.content}
                      userId={post.userId}
                      userName={post.userName}
                      userEmail={(post as any).userEmail || ''}
                      createdAt={post.createdAt}
                      updatedAt={post.updatedAt}
                      likesCount={post.likeCount}
                      commentsCount={post.commentCount}
                      isLiked={post.likes?.includes(currentUserId || '') || false}
                      onDelete={handleDelete}
                      onLike={handleLike}
                      onUserClick={onUserClick}
                    />
                  </motion.div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 通常レンダリング
    return (
      <AnimatePresence mode="popLayout">
        {posts.map((post, index) => {
          // PostCardの形式に変換
          const postForCard = {
            _id: post.id || post._id,
            title: (post as any).title || '',
            content: post.content,
            authorId: post.userId,
            authorName: post.userName,
            authorEmail: (post as any).userEmail || '',
            authorImage: post.userImage || null,
            createdAt: post.createdAt,
            updatedAt: post.updatedAt,
            likes: post.likes || [],
            likesCount: post.likeCount,
            commentsCount: post.commentCount,
            hashtags: post.hashtags || [],
            images: (post as any).images || [], // 画像配列を正しく渡す
          };

          return (
            <motion.div
              key={post.id || post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05, // スタッガーアニメーション
              }}
            >
              {usePostCard ? (
                <PostCard
                  post={postForCard}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  currentUserId={currentUserId}
                  onUserClick={onUserClick}
                />
              ) : (
                <TimelinePostCard
                  id={post.id || post._id}
                  title={(post as any).title}
                  content={post.content}
                  userId={post.userId}
                  userName={post.userName}
                  userEmail={(post as any).userEmail || ''}
                  createdAt={post.createdAt}
                  updatedAt={post.updatedAt}
                  likesCount={post.likeCount}
                  commentsCount={post.commentCount}
                  isLiked={post.likes?.includes(currentUserId || '') || false}
                  onDelete={handleDelete}
                  onLike={handleLike}
                  onUserClick={onUserClick}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    );
  };

  return (
    <Box ref={scrollRef} sx={{ position: 'relative' }}>
      {/* タイトルと投稿件数表示 */}
      {(showTitle || showPostCount) && (
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          {showTitle && (
            <Typography variant="h6" component="h2">
              {hashtag ? `#${hashtag}` : userId ? 'ユーザーの投稿' : '投稿一覧'}
            </Typography>
          )}
          {showPostCount && (
            <Typography variant="body2" color="text.secondary">
              ({posts.length}件)
            </Typography>
          )}
        </Box>
      )}

      {/* 新着投稿通知 */}
      <AnimatePresence>
        {newPostsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 80,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
            }}
          >
            <Button
              variant="contained"
              color="primary"
              startIcon={<NewReleasesIcon />}
              onClick={handleLoadNewPosts}
              sx={{
                borderRadius: 20,
                textTransform: 'none',
                boxShadow: 3,
              }}
            >
              {newPostsCount}件の新着投稿
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* コンテンツ */}
      {renderContent()}

      {/* ローディングインジケーター */}
      {hasNextPage && (
        <Box
          ref={observerRef}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            py: 3,
            minHeight: 80,
          }}
        >
          {isFetchingNextPage && <CircularProgress />}
        </Box>
      )}

      {/* 最下部に到達 */}
      {!hasNextPage && posts.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            すべての投稿を表示しました
          </Typography>
        </Box>
      )}

      {/* スクロールトップボタン */}
      <Zoom in={showScrollTop}>
        <Fab
          color="primary"
          size="small"
          onClick={handleScrollToTop}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUpIcon />
        </Fab>
      </Zoom>

      {/* リフレッシュ中のスナックバー */}
      <Snackbar
        open={isRefetching}
        message="更新中..."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
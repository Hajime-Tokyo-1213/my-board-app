'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import TimelinePostCard from './TimelinePostCard';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Post {
  id: string;
  title?: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
}

export default function Timeline() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // 投稿を取得する関数
  const fetchPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    if (loading || !session) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/timeline?page=${pageNum}&limit=10`);
      
      if (!response.ok) {
        throw new Error('タイムラインの取得に失敗しました');
      }

      const data = await response.json();
      
      if (isRefresh) {
        setPosts(data.posts);
      } else {
        setPosts(prev => [...prev, ...data.posts]);
      }
      
      setHasMore(data.pagination.hasMore);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [session, loading]);

  // 初回読み込み
  useEffect(() => {
    if (status === 'authenticated' && session) {
      fetchPosts(1, true);
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, session]);

  // 無限スクロール
  useEffect(() => {
    if (inView && hasMore && !loading && !initialLoading) {
      fetchPosts(page + 1);
    }
  }, [inView, hasMore, loading, initialLoading, page]);

  const handleRefresh = () => {
    setPage(1);
    fetchPosts(1, true);
  };

  const handleLike = (postId: string) => {
    // いいねの更新は既にTimelinePostCard内で処理されている
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postId));
      } else {
        alert('投稿の削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      alert('エラーが発生しました');
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setUserModalOpen(true);
  };

  const handleBackToTop = () => {
    router.push('/');
  };

  if (initialLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            startIcon={<HomeIcon />}
            onClick={handleBackToTop}
            sx={{ mb: 2 }}
          >
            掲示板トップへ戻る
          </Button>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            タイムライン
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            更新
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {posts.length === 0 ? (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              タイムラインに表示する投稿がありません。
            </Alert>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              タイムラインには、フォローしたユーザーと自分の投稿が時系列で表示されます。
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 他のユーザーをフォローしてみましょう
              • 自分で投稿を作成してみましょう
            </Typography>
          </Box>
        ) : (
          <>
            {posts.map((post) => (
              <TimelinePostCard
                key={post.id}
                {...post}
                onLike={handleLike}
                onDelete={handleDelete}
                onUserClick={handleUserClick}
              />
            ))}

            {hasMore && (
              <Box ref={ref} sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                {loading && <CircularProgress />}
              </Box>
            )}

            {!hasMore && posts.length > 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                すべての投稿を読み込みました
              </Typography>
            )}
          </>
        )}
      </Paper>

      {/* ユーザー情報モーダル */}
      {selectedUserId && (
        <UserProfileModal
          open={userModalOpen}
          onClose={() => {
            setUserModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />
      )}
    </Container>
  );
}

// UserProfileModalのインポートが必要
import dynamic from 'next/dynamic';
const UserProfileModal = dynamic(() => import('@/components/UserProfileModal'), {
  ssr: false,
});
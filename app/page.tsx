'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
  Pagination,
  Chip,
  AppBar,
  Toolbar,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  Person,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';
import { signOut } from 'next-auth/react';
import UserAvatar from '@/components/UserAvatar';
import UserProfileModal from '@/components/UserProfileModal';

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const fetchPosts = useCallback(async (page: number = 1) => {
    try {
      const response = await fetch(`/api/posts?page=${page}&limit=10`);
      if (response.status === 401) {
        router.push('/auth/signin');
        return;
      }
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || '投稿の取得に失敗しました');
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchPosts(currentPage);
    }
  }, [status, currentPage, fetchPosts]);

  const handleCreatePost = async (title: string, content: string) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      
      if (response.status === 401) {
        router.push('/auth/signin');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        fetchPosts(1);
        setCurrentPage(1);
      } else {
        setError(data.error || '投稿の作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const handleUpdatePost = async (id: string, title: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      
      const data = await response.json();
      if (data.success) {
        setPosts(posts.map(post => 
          post._id === id ? data.data : post
        ));
      } else {
        setError(data.error || '投稿の更新に失敗しました');
      }
    } catch (err) {
      console.error('Failed to update post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        fetchPosts(currentPage);
      } else {
        setError(data.error || '投稿の削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    router.push('/profile');
  };

  const handleTimeline = () => {
    handleMenuClose();
    router.push('/timeline');
  };

  const handleSignOut = () => {
    handleMenuClose();
    signOut({ callbackUrl: '/auth/signin' });
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setUserModalOpen(false);
    setSelectedUserId(null);
  };


  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            会員制掲示板
          </Typography>
          
          {session?.user && (
            <>
              <Typography variant="body2" sx={{ mr: 2 }}>
                {session.user.name || session.user.email}
              </Typography>
              <IconButton
                size="large"
                onClick={handleMenuOpen}
                color="inherit"
              >
                {session.user.name ? (
                  <UserAvatar name={session.user.name} size={32} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleTimeline}>
                  <TimelineIcon sx={{ mr: 1 }} /> タイムライン
                </MenuItem>
                <MenuItem onClick={handleProfile}>
                  <Person sx={{ mr: 1 }} /> プロフィール
                </MenuItem>
                <MenuItem onClick={handleSignOut}>
                  <ExitToApp sx={{ mr: 1 }} /> ログアウト
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth="md" 
        sx={{ 
          py: { xs: 2, sm: 3, md: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            mb: { xs: 2, sm: 3 }, 
            bgcolor: 'primary.main', 
            color: 'white',
            borderRadius: 2
          }}
        >
          <Typography 
            variant="h3" 
            component="h1" 
            align="center"
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.5rem', md: '3rem' },
              fontWeight: 700
            }}
          >
            会員制掲示板
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center" 
            sx={{ 
              mt: 1,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              opacity: 0.9
            }}
          >
            会員限定の掲示板です
          </Typography>
          {session?.user && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Chip 
                label={`ようこそ、${session.user.name || session.user.email}さん`}
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
            </Box>
          )}
        </Paper>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <PostForm onSubmit={handleCreatePost} />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Paper 
            sx={{ 
              p: { xs: 2, sm: 3 }, 
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <Typography color="text.secondary">
              まだ投稿がありません。最初の投稿をしてみましょう！
            </Typography>
          </Paper>
        ) : (
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 2,
                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                fontWeight: 600
              }}
            >
              投稿一覧 ({pagination?.totalCount || 0}件)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDelete={handleDeletePost}
                  onUpdate={handleUpdatePost}
                  currentUserId={session?.user?.id}
                  onUserClick={handleUserClick}
                />
              ))}
            </Box>
            
            {pagination && pagination.totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={pagination.totalPages}
                  page={currentPage}
                  onChange={handlePageChange}
                  color="primary"
                  size="large"
                />
              </Box>
            )}
          </Box>
        )}
      </Container>
      
      <UserProfileModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        userId={selectedUserId}
      />
    </>
  );
}
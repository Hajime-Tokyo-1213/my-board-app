'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
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
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import PostForm from '../components/PostForm';
import { signOut } from 'next-auth/react';
import UserAvatar from '../components/UserAvatar';
import UserProfileModal from '../components/UserProfileModal';
import NotificationBell from '../components/NotificationBell';
import HashtagDashboard from '../components/HashtagDashboard';
import InfiniteScroll from '../components/InfiniteScroll';


export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);


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
        // 投稿成功後、リストを更新
        setRefreshKey(prev => prev + 1);
      } else {
        setError(data.error || '投稿の作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('サーバーエラーが発生しました');
    }
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

  const handleDashboard = () => {
    handleMenuClose();
    router.push('/analytics');
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

  const handleHashtagClick = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    setRefreshKey(prev => prev + 1);
  };

  const handleClearHashtagFilter = () => {
    setSelectedHashtag(null);
    setRefreshKey(prev => prev + 1);
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
              <NotificationBell />
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
                <MenuItem onClick={handleDashboard}>
                  <DashboardIcon sx={{ mr: 1 }} /> ダッシュボード
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

        {/* ハッシュタグダッシュボード */}
        <Box sx={{ my: 3 }}>
          <HashtagDashboard 
            compact 
            showSearch={true}
            onHashtagClick={handleHashtagClick}
            selectedHashtag={selectedHashtag}
          />
        </Box>

        {/* 無限スクロール */}
        <Box>
          {selectedHashtag && (
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" color="primary">
                #{selectedHashtag} の検索結果
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearHashtagFilter}
              >
                フィルターをクリア
              </Button>
            </Box>
          )}
          <InfiniteScroll
            key={refreshKey}
            hashtag={selectedHashtag || undefined}
            enableVirtualization={false}
            showTitle={!selectedHashtag}
            showPostCount={true}
            usePostCard={true}
            onUserClick={handleUserClick}
            onHashtagClick={handleHashtagClick}
          />
        </Box>
      </Container>
      
      <UserProfileModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        userId={selectedUserId}
      />
    </>
  );
}
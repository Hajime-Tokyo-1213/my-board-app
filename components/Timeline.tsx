'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import InfiniteScroll from './InfiniteScroll';
import UserProfileModal from './UserProfileModal';

interface TimelineProps {
  userId?: string;
  hashtag?: string;
  showHeader?: boolean;
  enableVirtualization?: boolean;
}

export default function Timeline({
  userId,
  hashtag,
  showHeader = true,
  enableVirtualization = true,
}: TimelineProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ユーザークリック処理
  const handleUserClick = (clickedUserId: string) => {
    setSelectedUserId(clickedUserId);
    setUserModalOpen(true);
  };

  // ハッシュタグクリック処理
  const handleHashtagClick = (tag: string) => {
    router.push(`/search?hashtag=${encodeURIComponent(tag)}`);
  };

  // ホームへ戻る
  const handleBackToTop = () => {
    router.push('/');
  };

  // リフレッシュ
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // 認証チェック
  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {showHeader && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="text"
              startIcon={<HomeIcon />}
              onClick={handleBackToTop}
              sx={{ mb: 1 }}
            >
              ホームに戻る
            </Button>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
              {hashtag ? `#${hashtag}` : userId ? 'ユーザータイムライン' : 'タイムライン'}
            </Typography>
            {!hashtag && !userId && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                フォローしているユーザーの投稿を表示
              </Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRefresh}
              size="small"
            >
              更新
            </Button>
          </Box>
        </Paper>
      )}

      {/* 無限スクロールコンポーネント */}
      <InfiniteScroll
        key={refreshKey}
        userId={userId}
        hashtag={hashtag}
        enableVirtualization={enableVirtualization}
        onUserClick={handleUserClick}
        onHashtagClick={handleHashtagClick}
      />

      {/* ユーザープロフィールモーダル */}
      <Dialog
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setUserModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
          {selectedUserId && (
            <UserProfileModal
              userId={selectedUserId}
              open={userModalOpen}
              onClose={() => setUserModalOpen(false)}
            />
          )}
        </Box>
      </Dialog>
    </Container>
  );
}
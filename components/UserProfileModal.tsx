'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/UserAvatar';
import FollowButton from '@/src/components/FollowButton';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string | null;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  bio?: string;
  createdAt: string;
  followingCount?: number;
  followersCount?: number;
}

export default function UserProfileModal({ open, onClose, userId }: UserProfileModalProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && userId) {
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('ユーザー情報の取得に失敗しました');
      }
      const data = await response.json();
      setUserData(data.data);
    } catch (error) {
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleClose = () => {
    setUserData(null);
    setError('');
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        ユーザー情報
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ p: 3 }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : userData ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <UserAvatar name={userData.name} size={80} />
              <Box sx={{ ml: 3, flex: 1 }}>
                <Typography variant="h5" gutterBottom>
                  {userData.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2">
                    {userData.email}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ ml: 2 }}>
                <FollowButton 
                  userId={userData.id}
                  userName={userData.name}
                  variant="contained"
                  size="medium"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="h6" sx={{ lineHeight: 1 }}>
                    {userData.followingCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    フォロー中
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon sx={{ color: 'text.secondary' }} />
                <Box>
                  <Typography variant="h6" sx={{ lineHeight: 1 }}>
                    {userData.followersCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    フォロワー
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <DescriptionIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    自己紹介
                  </Typography>
                </Box>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    whiteSpace: 'pre-wrap',
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    minHeight: 60,
                  }}
                >
                  {userData.bio || '自己紹介が設定されていません'}
                </Typography>
              </Box>

              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    登録日
                  </Typography>
                </Box>
                <Typography variant="body2">
                  {formatDate(userData.createdAt)}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
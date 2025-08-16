'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/UserAvatar';

interface User {
  id: string;
  email: string;
  name: string;
  bio: string;
  emailVerified: Date | null;
  createdAt: Date;
}

interface ProfileViewProps {
  user: User;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleEditProfile = () => {
    setIsLoading(true);
    router.push('/profile/edit');
  };

  const handleChangePassword = () => {
    setIsLoading(true);
    router.push('/profile/password');
  };

  const handleBackToTop = () => {
    setIsLoading(true);
    router.push('/');
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="text"
            startIcon={<HomeIcon />}
            onClick={handleBackToTop}
            disabled={isLoading}
            sx={{ mb: 2 }}
          >
            掲示板トップへ戻る
          </Button>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <UserAvatar name={user.name} size={80} />
          <Box sx={{ ml: 3, flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              {user.name}
            </Typography>
            {user.emailVerified && (
              <Chip
                label="メール認証済み"
                color="success"
                size="small"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Stack direction="column" spacing={1}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditProfile}
              disabled={isLoading}
            >
              プロフィール編集
            </Button>
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={handleChangePassword}
              disabled={isLoading}
            >
              パスワード変更
            </Button>
          </Stack>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                メールアドレス
              </Typography>
            </Box>
            <Typography variant="body1">
              {user.email}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                名前
              </Typography>
            </Box>
            <Typography variant="body1">
              {user.name}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <DescriptionIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                自己紹介
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {user.bio || '自己紹介が設定されていません'}
            </Typography>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                登録日
              </Typography>
            </Box>
            <Typography variant="body1">
              {formatDate(user.createdAt)}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
}
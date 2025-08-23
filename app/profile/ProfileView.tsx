'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Stack,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Home as HomeIcon,
  Delete as DeleteIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import UserAvatar from '../../components/UserAvatar';

interface User {
  id: string;
  email: string;
  name: string;
  bio: string;
  emailVerified: Date | null;
  createdAt: Date;
  followingCount?: number;
  followersCount?: number;
}

interface ProfileViewProps {
  user: User;
}

export default function ProfileView({ user }: ProfileViewProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setIsDeleting(true);

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setDeleteError(data.error || 'アカウント削除に失敗しました');
        setIsDeleting(false);
        return;
      }

      // 削除成功時、セッションを終了してサインインページへ
      await signOut({ callbackUrl: '/auth/signin' });
    } catch (error) {
      console.error('Delete account error:', error);
      setDeleteError('アカウント削除中にエラーが発生しました');
      setIsDeleting(false);
    }
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

        <Box sx={{ display: 'flex', gap: 4, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="h5" sx={{ lineHeight: 1, fontWeight: 'bold' }}>
                {user.followingCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                フォロー中
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GroupIcon sx={{ color: 'text.secondary' }} />
            <Box>
              <Typography variant="h5" sx={{ lineHeight: 1, fontWeight: 'bold' }}>
                {user.followersCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                フォロワー
              </Typography>
            </Box>
          </Box>
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

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom color="error">
            危険な操作
          </Typography>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isLoading}
          >
            アカウントを削除
          </Button>
        </Box>
      </Paper>

      {/* アカウント削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeletePassword('');
          setDeleteError('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle color="error">
          アカウント削除の確認
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            アカウントを削除すると、すべてのデータが完全に削除されます。
            この操作は取り消すことができません。
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {deleteError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            本当に削除する場合は、確認のためパスワードを入力してください。
          </DialogContentText>
          <TextField
            fullWidth
            type="password"
            label="パスワード"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={isDeleting}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setDeletePassword('');
              setDeleteError('');
            }}
            disabled={isDeleting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteAccount}
            color="error"
            variant="contained"
            disabled={!deletePassword || isDeleting}
          >
            {isDeleting ? '削除中...' : 'アカウントを削除'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
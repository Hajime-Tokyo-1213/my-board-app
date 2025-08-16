'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/UserAvatar';

export default function ProfileEditPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth/signin');
          return;
        }
        throw new Error('プロフィールの取得に失敗しました');
      }
      const data = await response.json();
      setName(data.data.name);
      setBio(data.data.bio || '');
      setEmail(data.data.email);
    } catch (error) {
      setError('プロフィールの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // バリデーション
    if (!name.trim()) {
      setError('名前は必須です');
      return;
    }
    
    if (name.length > 50) {
      setError('名前は50文字以内で入力してください');
      return;
    }
    
    if (bio.length > 200) {
      setError('自己紹介は200文字以内で入力してください');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'プロフィールの更新に失敗しました');
      }

      setSuccess('プロフィールを更新しました');
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'プロフィールの更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/profile');
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <UserAvatar name={name || 'User'} size={60} />
          <Typography variant="h5" component="h1" sx={{ ml: 2 }}>
            プロフィール編集
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="メールアドレス"
              value={email}
              disabled
              fullWidth
              helperText="メールアドレスは変更できません"
            />

            <TextField
              label="名前"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              inputProps={{ maxLength: 50 }}
              helperText={`${name.length}/50文字`}
              error={name.length > 50}
            />

            <TextField
              label="自己紹介"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              fullWidth
              multiline
              rows={4}
              inputProps={{ maxLength: 200 }}
              helperText={`${bio.length}/200文字`}
              error={bio.length > 200}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isSaving || !name.trim() || name.length > 50 || bio.length > 200}
              >
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </Box>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
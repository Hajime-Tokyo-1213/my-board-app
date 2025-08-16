'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import NextLink from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'リセットメールの送信に失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8 }}>
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              メール送信完了
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              パスワードリセットのリンクを
              <br />
              <strong>{email}</strong>
              <br />
              に送信しました。
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              メールをご確認の上、リンクをクリックして
              新しいパスワードを設定してください。
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
              メールが届かない場合は、迷惑メールフォルダをご確認ください。
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/auth/signin')}
            >
              ログインページへ戻る
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            パスワードリセット
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            登録したメールアドレスを入力してください。
            パスワードリセット用のリンクをお送りします。
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="メールアドレス"
              name="email"
              autoComplete="email"
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  送信中...
                </>
              ) : (
                'リセットメールを送信'
              )}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Link 
                component={NextLink} 
                href="/auth/signin" 
                variant="body2"
                sx={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <ArrowBackIcon sx={{ mr: 0.5, fontSize: 18 }} />
                ログインページに戻る
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
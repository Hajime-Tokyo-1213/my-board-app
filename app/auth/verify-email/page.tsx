'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('無効なリンクです');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'メールアドレスが確認されました');
      } else {
        setStatus('error');
        setMessage(data.error || 'メール確認に失敗しました');
      }
    } catch (error) {
      setStatus('error');
      setMessage('メール確認中にエラーが発生しました');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8 }}>
        <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
          {status === 'loading' && (
            <>
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6">
                メールアドレスを確認しています...
              </Typography>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                確認完了
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                メールアドレスの確認が完了しました。
                ログインして掲示板をご利用ください。
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => router.push('/auth/signin')}
              >
                ログインページへ
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                確認失敗
              </Typography>
              <Alert severity="error" sx={{ mb: 3 }}>
                {message}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                リンクが無効または期限切れの可能性があります。
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => router.push('/auth/signup')}
              >
                新規登録ページへ
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8 }}>
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h6">
              読み込み中...
            </Typography>
          </Paper>
        </Box>
      </Container>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
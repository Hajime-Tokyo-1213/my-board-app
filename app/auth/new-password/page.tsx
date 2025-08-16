'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Lock as LockIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

function NewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('無効なリンクです');
      setIsValidating(false);
      return;
    }
    
    // トークンの形式を簡単にチェック（実際の検証はAPIで行う）
    if (token.length < 32) {
      setError('無効なトークンです');
      setIsValidating(false);
      return;
    }
    
    setTokenValid(true);
    setIsValidating(false);
  }, [token]);

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 25;
    if (password.match(/\d/)) strength += 25;
    if (password.match(/[^a-zA-Z\d]/)) strength += 25;
    return strength;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // バリデーション
    if (!password || !confirmPassword) {
      setError('すべての項目を入力してください');
      return;
    }
    
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'パスワードのリセットに失敗しました');
      }
    } catch (error) {
      setError('サーバーエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ 
          marginTop: 8, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!tokenValid) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8 }}>
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              エラー
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {error || '無効なリンクです'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              リンクが無効または期限切れの可能性があります。
              もう一度パスワードリセットをお試しください。
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/auth/reset-password')}
            >
              パスワードリセットページへ
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  if (success) {
    return (
      <Container component="main" maxWidth="xs">
        <Box sx={{ marginTop: 8 }}>
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              パスワード変更完了
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              パスワードが正常に変更されました。
              新しいパスワードでログインしてください。
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => router.push('/auth/signin')}
            >
              ログインページへ
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
            新しいパスワードの設定
          </Typography>
          
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            新しいパスワードを入力してください
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
              name="password"
              label="新しいパスワード（8文字以上）"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {password && (
              <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  パスワード強度
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={passwordStrength(password)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'grey.300',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor:
                        passwordStrength(password) < 50
                          ? 'error.main'
                          : passwordStrength(password) < 75
                          ? 'warning.main'
                          : 'success.main',
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {passwordStrength(password) < 50 ? '弱い' :
                   passwordStrength(password) < 75 ? '普通' : '強い'}
                </Typography>
              </Box>
            )}
            
            <TextField
              margin="normal"
              required
              fullWidth
              name="confirmPassword"
              label="パスワード（確認）"
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              error={confirmPassword !== '' && password !== confirmPassword}
              helperText={
                confirmPassword !== '' && password !== confirmPassword
                  ? 'パスワードが一致しません'
                  : ''
              }
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading || !password || !confirmPassword || password !== confirmPassword}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  設定中...
                </>
              ) : (
                'パスワードを設定'
              )}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default function NewPasswordPage() {
  return (
    <Suspense fallback={
      <Container component="main" maxWidth="xs">
        <Box sx={{ 
          marginTop: 8, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px'
        }}>
          <CircularProgress />
        </Box>
      </Container>
    }>
      <NewPasswordForm />
    </Suspense>
  );
}
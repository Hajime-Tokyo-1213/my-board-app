'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
}

export default function EditPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!params.id) return;

      try {
        const response = await fetch(`/api/posts/${params.id}`);
        const data = await response.json();
        
        if (data.success) {
          const postData = data.data;
          
          // 投稿者チェック
          if (session?.user?.id !== postData.authorId) {
            setError('他のユーザーの投稿は編集できません');
            setTimeout(() => router.push('/'), 2000);
            return;
          }
          
          setPost(postData);
          setTitle(postData.title);
          setContent(postData.content);
        } else {
          setError(data.error || '投稿の取得に失敗しました');
        }
      } catch (err) {
        console.error('Failed to fetch post:', err);
        setError('サーバーエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated' && params.id) {
      fetchPost();
    }
  }, [status, params.id, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('タイトルと本文を入力してください');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/posts/${params.id}`);
      } else {
        setError(data.error || '投稿の更新に失敗しました');
      }
    } catch (err) {
      console.error('Failed to update post:', err);
      setError('サーバーエラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (!post) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error || '投稿が見つかりません'}</Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/')}
          sx={{ mt: 2 }}
        >
          戻る
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push(`/posts/${params.id}`)}
        sx={{ mb: 2 }}
      >
        戻る
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          投稿を編集
        </Typography>

        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            margin="normal"
            required
            inputProps={{ maxLength: 100 }}
            helperText={`${title.length}/100文字`}
          />

          <TextField
            fullWidth
            label="本文"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            margin="normal"
            required
            multiline
            rows={8}
            inputProps={{ maxLength: 1000 }}
            helperText={`${content.length}/1000文字`}
          />

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              fullWidth
            >
              {submitting ? <CircularProgress size={24} /> : '更新する'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push(`/posts/${params.id}`)}
              disabled={submitting}
              fullWidth
            >
              キャンセル
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
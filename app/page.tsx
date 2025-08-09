'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import PostForm from '@/components/PostForm';
import PostCard from '@/components/PostCard';

interface Post {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      if (data.success) {
        setPosts(data.data);
      } else {
        console.error('API Error Details:', data);
        setError(`投稿の取得に失敗しました: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (content: string) => {
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.success) {
        setPosts([data.data, ...posts]);
      } else {
        setError(data.error || '投稿の作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const handleUpdatePost = async (id: string, content: string) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (data.success) {
        setPosts(posts.map(post => 
          post._id === id ? data.data : post
        ));
      } else {
        setError(data.error || '投稿の更新に失敗しました');
      }
    } catch (err) {
      console.error('Failed to update post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setPosts(posts.filter(post => post._id !== id));
      } else {
        setError('投稿の削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  return (
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
          オープン掲示板
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
          誰でも自由に投稿・編集・削除ができます
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <PostForm onSubmit={handleCreatePost} />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : posts.length === 0 ? (
        <Paper 
          sx={{ 
            p: { xs: 2, sm: 3 }, 
            textAlign: 'center',
            borderRadius: 2
          }}
        >
          <Typography color="text.secondary">
            まだ投稿がありません。最初の投稿をしてみましょう！
          </Typography>
        </Paper>
      ) : (
        <Box>
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 2,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              fontWeight: 600
            }}
          >
            投稿一覧 ({posts.length}件)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onDelete={handleDeletePost}
                onUpdate={handleUpdatePost}
              />
            ))}
          </Box>
        </Box>
      )}
    </Container>
  );
}
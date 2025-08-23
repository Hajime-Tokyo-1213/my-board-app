'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Avatar,
  Chip,
  IconButton,
  ImageList,
  ImageListItem,
} from '@mui/material';
import { ArrowBack, Edit, Delete, Favorite, FavoriteBorder, Comment } from '@mui/icons-material';
import UserAvatar from '../../../components/UserAvatar';
import CommentSection from '../../../components/CommentSection';

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string | null;
  createdAt: string;
  updatedAt: string;
  likes?: string[];
  likesCount?: number;
  commentsCount?: number;
  images?: {
    id: string;
    url: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
  }[];
}

export default function PostDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

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
          setPost(data.data);
          setLikesCount(data.data.likesCount || 0);
          if (data.data.likes && session?.user?.id) {
            setIsLiked(data.data.likes.includes(session.user.id));
          }
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

    if (status === 'authenticated') {
      fetchPost();
    }
  }, [status, params.id]);

  const handleLike = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const response = await fetch(`/api/posts/${params.id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      } else {
        console.error('Failed to like post:', response.status, data);
        setError(data.error || 'いいねの処理に失敗しました');
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この投稿を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      if (data.success) {
        router.push('/');
      } else {
        setError(data.error || '投稿の削除に失敗しました');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      setError('サーバーエラーが発生しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        <Alert severity="error">投稿が見つかりません</Alert>
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

  const isAuthor = session?.user?.id === post.authorId;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={() => router.push('/')}
        sx={{ mb: 2 }}
      >
        戻る
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {post.title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {post.authorImage ? (
              <Avatar src={post.authorImage} alt={post.authorName} />
            ) : (
              <UserAvatar name={post.authorName} size={40} />
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {post.authorName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(post.createdAt)}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <IconButton
                onClick={handleLike}
                disabled={isLiking}
                color={isLiked ? "error" : "default"}
              >
                {isLiked ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
              <Typography variant="body2" color="text.secondary">
                {likesCount} いいね
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Comment color="action" />
              <Typography variant="body2" color="text.secondary">
                {post.commentsCount || 0} コメント
              </Typography>
            </Box>
          </Box>

          {isAuthor && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => router.push(`/posts/${params.id}/edit`)}
                size="small"
              >
                編集
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={handleDelete}
                size="small"
              >
                削除
              </Button>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {post.content}
        </Typography>

        {/* 画像表示 */}
        {post.images && post.images.length > 0 && (
          <Box sx={{ mt: 3, mb: 3 }}>
            <ImageList 
              sx={{ width: '100%', height: 'auto' }} 
              cols={post.images.length === 1 ? 1 : post.images.length === 2 ? 2 : 3} 
              gap={8}
            >
              {post.images.map((image, index) => (
                <ImageListItem key={image.id}>
                  <img
                    src={image.largeUrl || image.url}
                    alt={`投稿画像 ${index + 1}`}
                    loading="lazy"
                    style={{
                      cursor: 'pointer',
                      borderRadius: '8px',
                      width: '100%',
                      height: 'auto',
                      objectFit: 'cover',
                      maxHeight: '600px'
                    }}
                    onClick={() => window.open(image.url, '_blank')}
                  />
                </ImageListItem>
              ))}
            </ImageList>
          </Box>
        )}

        {post.updatedAt !== post.createdAt && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            最終更新: {formatDate(post.updatedAt)}
          </Typography>
        )}
      </Paper>

      <CommentSection postId={params.id as string} initialExpanded={true} />
    </Container>
  );
}
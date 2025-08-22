'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import { ArrowBack, Tag, Image as ImageIcon } from '@mui/icons-material';
import { extractHashtags } from '@/app/utils/hashtag';
import ImageUploader from '@/components/ImageUploader';

export default function NewPostPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<any[]>([]);

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  // ハッシュタグの検出
  const handleContentChange = (value: string) => {
    setContent(value);
    const combinedText = `${title} ${value}`;
    const tags = extractHashtags(combinedText);
    setDetectedTags(tags);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const combinedText = `${value} ${content}`;
    const tags = extractHashtags(combinedText);
    setDetectedTags(tags);
  };

  const handleImageUpload = (images: any[]) => {
    setUploadedImages(prev => [...prev, ...images]);
  };

  const handleImageRemove = (imageId: string) => {
    setUploadedImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('タイトルと本文を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          title, 
          content,
          images: uploadedImages.map(img => ({
            id: img.id,
            url: img.url,
            thumbnailUrl: img.thumbnailUrl,
            mediumUrl: img.mediumUrl,
            largeUrl: img.largeUrl,
          }))
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push('/');
      } else {
        setError(data.error || '投稿の作成に失敗しました');
      }
    } catch (err) {
      console.error('Failed to create post:', err);
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

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
        <Typography variant="h4" component="h1" gutterBottom>
          新規投稿
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
            onChange={(e) => handleTitleChange(e.target.value)}
            helperText="ハッシュタグ（#タグ）を使用できます"
            margin="normal"
            required
            inputProps={{ maxLength: 100 }}
          />

          <TextField
            fullWidth
            label="本文"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            margin="normal"
            required
            multiline
            rows={8}
            inputProps={{ maxLength: 1000 }}
            helperText={`${content.length}/1000文字 | ハッシュタグ（#タグ）を使用できます`}
          />

          {/* 検出されたハッシュタグの表示 */}
          {detectedTags.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                検出されたハッシュタグ:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {detectedTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    icon={<Tag />}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 画像アップロード */}
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }}>
              <Chip icon={<ImageIcon />} label="画像を追加" size="small" />
            </Divider>
            <ImageUploader
              onUpload={handleImageUpload}
              onRemove={handleImageRemove}
              uploadedImages={uploadedImages}
            />
          </Box>

          <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              fullWidth
            >
              {loading ? <CircularProgress size={24} /> : '投稿する'}
            </Button>
            <Button
              variant="outlined"
              onClick={() => router.push('/')}
              disabled={loading}
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
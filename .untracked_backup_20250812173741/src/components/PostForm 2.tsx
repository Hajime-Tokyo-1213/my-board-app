'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface PostFormProps {
  onSubmit: (content: string) => Promise<void>;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Failed to submit post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        新しい投稿
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="今何を考えていますか？"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          helperText={`${content.length}/200`}
          error={content.length > 200}
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          endIcon={<SendIcon />}
          disabled={!content.trim() || content.length > 200 || isSubmitting}
          fullWidth
        >
          {isSubmitting ? '投稿中...' : '投稿する'}
        </Button>
      </Box>
    </Paper>
  );
}
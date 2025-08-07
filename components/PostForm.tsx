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
  onSubmit: (content: string) => void;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('投稿内容は必須です');
      return;
    }
    
    if (content.length > 200) {
      setError('投稿は200文字以内にしてください');
      return;
    }
    
    onSubmit(content);
    setContent('');
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    if (e.target.value.length > 200) {
      setError('投稿は200文字以内にしてください');
    } else {
      setError('');
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        新規投稿
      </Typography>
      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          multiline
          rows={4}
          placeholder="投稿内容を入力してください（200文字以内）"
          value={content}
          onChange={handleChange}
          error={!!error}
          helperText={error || `${content.length}/200`}
          sx={{ mb: 2 }}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={!content.trim() || !!error}
          startIcon={<SendIcon />}
        >
          投稿する
        </Button>
      </Box>
    </Paper>
  );
}
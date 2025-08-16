'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Paper,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { Add } from '@mui/icons-material';

interface PostFormProps {
  onSubmit: (title: string, content: string) => void;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const router = useRouter();

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        mb: 3,
        borderRadius: 2
      }}
    >
      <Typography variant="h6" gutterBottom>
        新しい投稿を作成
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          fullWidth
          onClick={() => router.push('/posts/new')}
          size="large"
        >
          新規投稿を作成
        </Button>
      </Box>
    </Paper>
  );
}
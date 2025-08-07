'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';

interface PostCardProps {
  post: {
    _id: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  };
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string) => void;
}

export default function PostCard({ post, onDelete, onUpdate }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!editContent.trim()) {
      setError('投稿内容は必須です');
      return;
    }
    if (editContent.length > 200) {
      setError('投稿は200文字以内にしてください');
      return;
    }
    onUpdate(post._id, editContent);
    setIsEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setEditContent(post.content);
    setIsEditing(false);
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditContent(e.target.value);
    if (e.target.value.length > 200) {
      setError('投稿は200文字以内にしてください');
    } else {
      setError('');
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        {isEditing ? (
          <Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={editContent}
              onChange={handleChange}
              error={!!error}
              helperText={error || `${editContent.length}/200`}
              variant="outlined"
              autoFocus
            />
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={!!error}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
              >
                キャンセル
              </Button>
            </Stack>
          </Box>
        ) : (
          <>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {post.content}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {new Date(post.createdAt).toLocaleString('ja-JP')}
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(true)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(post._id)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
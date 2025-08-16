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
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CancelIcon from '@mui/icons-material/Cancel';
import SaveIcon from '@mui/icons-material/Save';

interface Post {
  _id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface PostCardProps {
  post: Post;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, content: string) => Promise<void>;
}

export default function PostCard({ post, onDelete, onUpdate }: PostCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async () => {
    if (!editContent.trim() || editContent === post.content) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(post._id, editContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete(post._id);
    } catch (error) {
      console.error('Failed to delete post:', error);
      setIsLoading(false);
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
              onChange={(e) => setEditContent(e.target.value)}
              disabled={isLoading}
              helperText={`${editContent.length}/200`}
              error={editContent.length > 200}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleUpdate}
                disabled={!editContent.trim() || editContent.length > 200 || isLoading}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CancelIcon />}
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(post.content);
                }}
                disabled={isLoading}
              >
                キャンセル
              </Button>
            </Box>
          </Box>
        ) : (
          <>
            <Typography
              variant="body1"
              sx={{ whiteSpace: 'pre-wrap', mb: 2 }}
            >
              {post.content}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                投稿日時: {formatDate(post.createdAt)}
                {post.updatedAt !== post.createdAt && (
                  <> (編集済み: {formatDate(post.updatedAt)})</>
                )}
              </Typography>
              <Box>
                <Tooltip title="編集">
                  <IconButton
                    size="small"
                    onClick={() => setIsEditing(true)}
                    disabled={isLoading}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="削除">
                  <IconButton
                    size="small"
                    onClick={handleDelete}
                    disabled={isLoading}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
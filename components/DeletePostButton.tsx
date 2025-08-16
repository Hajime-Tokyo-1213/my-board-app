'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
} from '@mui/material';
import { Delete } from '@mui/icons-material';

interface DeletePostButtonProps {
  postId: string;
  onDelete?: () => void;
  variant?: 'icon' | 'button';
  size?: 'small' | 'medium' | 'large';
}

export default function DeletePostButton({ 
  postId, 
  onDelete,
  variant = 'button',
  size = 'small'
}: DeletePostButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        handleClose();
        if (onDelete) {
          onDelete();
        } else {
          router.push('/');
        }
      } else {
        console.error('Failed to delete post:', data.error);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <IconButton
          onClick={handleClickOpen}
          color="error"
          size={size}
        >
          <Delete />
        </IconButton>
      ) : (
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleClickOpen}
          size={size}
        >
          削除
        </Button>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>投稿を削除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            この投稿を削除してもよろしいですか？
            削除した投稿は復元できません。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            キャンセル
          </Button>
          <Button 
            onClick={handleDelete} 
            color="error" 
            variant="contained"
            disabled={loading}
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
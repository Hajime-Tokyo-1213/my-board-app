'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  CircularProgress,
  Alert,
  Divider
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import CommentIcon from '@mui/icons-material/Comment';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Comment {
  _id: string;
  content: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommentListProps {
  postId: string;
}

export default function CommentList({ postId }: CommentListProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // コメント取得
  const fetchComments = async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const response = await fetch(`/api/posts/${postId}/comments?page=${page}`);
      if (!response.ok) throw new Error('コメントの取得に失敗しました');
      
      const result = await response.json();
      
      if (result.success && result.data) {
        const { comments, pagination } = result.data;
        
        if (append) {
          setComments(prev => [...prev, ...comments]);
        } else {
          setComments(comments);
        }
        
        setTotalComments(pagination.total);
        setHasMore(pagination.hasMore);
        setCurrentPage(pagination.page);
      } else {
        throw new Error(result.error || 'コメントの取得に失敗しました');
      }
    } catch (err) {
      setError('コメントの読み込みに失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // 初回読み込み
  useEffect(() => {
    fetchComments();
  }, [postId]);

  // コメント投稿
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!session) {
      setError('コメントを投稿するにはログインが必要です');
      return;
    }

    if (!newComment.trim()) {
      setError('コメントを入力してください');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの投稿に失敗しました');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setComments(prev => [result.data, ...prev]);
        setTotalComments(prev => prev + 1);
        setNewComment('');
      } else {
        throw new Error(result.error || 'コメントの投稿に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // コメント削除
  const handleDelete = async (commentId: string) => {
    if (!confirm('このコメントを削除しますか？')) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'コメントの削除に失敗しました');
      }

      setComments(prev => prev.filter(c => c._id !== commentId));
      setTotalComments(prev => prev - 1);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // もっと見る
  const handleLoadMore = () => {
    fetchComments(currentPage + 1, true);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CommentIcon />
        コメント ({totalComments})
      </Typography>

      {/* コメント投稿フォーム */}
      {session && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              placeholder="コメントを入力..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={submitting}
              error={!!error && newComment.length > 0}
              helperText={newComment.length > 0 ? `${newComment.length}/500` : ''}
              inputProps={{ maxLength: 500 }}
            />
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {error && <Alert severity="error" sx={{ flex: 1, mr: 2 }}>{error}</Alert>}
              <Button
                type="submit"
                variant="contained"
                endIcon={<SendIcon />}
                disabled={submitting || !newComment.trim()}
                sx={{ ml: 'auto' }}
              >
                {submitting ? <CircularProgress size={24} /> : '投稿'}
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* コメント一覧 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : comments.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            まだコメントがありません
          </Typography>
        </Paper>
      ) : (
        <>
          <List>
            {comments.map((comment, index) => (
              <React.Fragment key={comment._id}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    session?.user?.id === comment.authorId && (
                      <IconButton
                        edge="end"
                        aria-label="delete"
                        onClick={() => handleDelete(comment._id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      src={comment.authorImage || undefined}
                      alt={comment.authorName}
                    >
                      {comment.authorName[0]}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Typography variant="subtitle2">
                          {comment.authorName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: ja
                          })}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}
                      >
                        {comment.content}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < comments.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>

          {/* もっと見るボタン */}
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                onClick={handleLoadMore}
                disabled={loadingMore}
                variant="outlined"
              >
                {loadingMore ? <CircularProgress size={24} /> : 'もっと見る'}
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
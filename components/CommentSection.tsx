'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Collapse,
  Skeleton,
  Stack,
  Tooltip,
  Badge,
  InputAdornment
} from '@mui/material';
import {
  Send as SendIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PersonOutline as PersonIcon,
  AccessTime as TimeIcon,
  MoreHoriz as MoreIcon
} from '@mui/icons-material';
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

interface CommentSectionProps {
  postId: string;
  initialExpanded?: boolean;
}

export default function CommentSection({ postId, initialExpanded = false }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // コメント取得
  const fetchComments = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await fetch(`/api/posts/${postId}/comments?page=${page}&limit=20`);
      const result = await response.json();

      if (result.success && result.data) {
        const { comments: newComments, pagination } = result.data;
        
        if (append) {
          setComments(prev => [...prev, ...newComments]);
        } else {
          setComments(newComments);
        }
        
        setTotalComments(pagination.total);
        setHasMore(pagination.hasMore);
        setCurrentPage(pagination.page);
      } else {
        throw new Error(result.error || 'コメントの取得に失敗しました');
      }
    } catch (err: any) {
      setError('コメントの読み込みに失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId]);

  // 初回読み込み
  useEffect(() => {
    if (expanded && comments.length === 0) {
      fetchComments();
    }
  }, [expanded, fetchComments]);

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

    if (newComment.length > 500) {
      setError('コメントは500文字以内で入力してください');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      });

      const result = await response.json();

      if (result.success && result.data) {
        setComments(prev => [result.data, ...prev]);
        setTotalComments(prev => prev + 1);
        setNewComment('');
        setSuccess('コメントを投稿しました');
        if (!expanded) setExpanded(true);
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

    setDeletingId(commentId);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok) {
        setComments(prev => prev.filter(c => c._id !== commentId));
        setTotalComments(prev => prev - 1);
        setSuccess('コメントを削除しました');
      } else {
        throw new Error(result.error || 'コメントの削除に失敗しました');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // もっと見る
  const handleLoadMore = () => {
    fetchComments(currentPage + 1, true);
  };

  // 展開/折りたたみ切り替え
  const toggleExpanded = () => {
    setExpanded(!expanded);
    if (!expanded && comments.length === 0) {
      fetchComments();
    }
  };

  // 時間フォーマット
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja
      });
    } catch {
      return '';
    }
  };

  return (
    <Box sx={{ mt: 3 }}>
      {/* ヘッダー */}
      <Paper 
        sx={{ 
          p: 2, 
          cursor: 'pointer',
          transition: 'all 0.3s',
          '&:hover': {
            bgcolor: 'action.hover'
          }
        }}
        onClick={toggleExpanded}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={totalComments} color="primary" max={999}>
              <CommentIcon />
            </Badge>
            <Typography variant="h6" component="h3">
              コメント
            </Typography>
            {totalComments > 0 && (
              <Chip 
                label={`${totalComments}件`} 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Paper>

      {/* コメントセクション本体 */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Paper sx={{ mt: 1, p: 2 }}>
          {/* コメント入力フォーム */}
          {session ? (
            <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar
                  src={session.user?.image || undefined}
                  alt={session.user?.name || ''}
                  sx={{ width: 40, height: 40 }}
                >
                  {session.user?.name?.[0] || <PersonIcon />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    variant="outlined"
                    placeholder="コメントを入力..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={submitting}
                    error={!!error && !!newComment}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="caption" color="text.secondary">
                            {newComment.length}/500
                          </Typography>
                        </InputAdornment>
                      )
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                  <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Button
                      type="button"
                      size="small"
                      onClick={() => setNewComment('')}
                      disabled={!newComment || submitting}
                    >
                      クリア
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      endIcon={submitting ? <CircularProgress size={16} /> : <SendIcon />}
                      disabled={submitting || !newComment.trim()}
                    >
                      投稿
                    </Button>
                  </Box>
                </Box>
              </Box>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              コメントを投稿するにはログインが必要です
            </Alert>
          )}

          <Divider sx={{ mb: 2 }} />

          {/* コメント一覧 */}
          {loading ? (
            <Stack spacing={2}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ display: 'flex', gap: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="30%" />
                    <Skeleton variant="text" width="100%" />
                    <Skeleton variant="text" width="80%" />
                  </Box>
                </Box>
              ))}
            </Stack>
          ) : comments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CommentIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography color="text.secondary">
                まだコメントがありません
              </Typography>
              {session && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  最初のコメントを投稿してみましょう
                </Typography>
              )}
            </Box>
          ) : (
            <>
              <List sx={{ p: 0 }}>
                {comments.map((comment, index) => (
                  <React.Fragment key={comment._id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        px: 0,
                        opacity: deletingId === comment._id ? 0.5 : 1,
                        transition: 'opacity 0.3s'
                      }}
                      secondaryAction={
                        session?.user?.id === comment.authorId && (
                          <Tooltip title="削除">
                            <IconButton
                              edge="end"
                              aria-label="delete"
                              onClick={() => handleDelete(comment._id)}
                              disabled={deletingId === comment._id}
                              size="small"
                              sx={{
                                color: 'error.main',
                                '&:hover': {
                                  bgcolor: 'error.light',
                                  color: 'error.dark'
                                }
                              }}
                            >
                              {deletingId === comment._id ? (
                                <CircularProgress size={20} />
                              ) : (
                                <DeleteIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={comment.authorImage || undefined}
                          alt={comment.authorName}
                          sx={{ width: 36, height: 36 }}
                        >
                          {comment.authorName[0] || <PersonIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {comment.authorName}
                            </Typography>
                            {session?.user?.id === comment.authorId && (
                              <Chip label="あなた" size="small" color="primary" variant="outlined" />
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', mr: 5 }}>
                              <TimeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {formatTime(comment.createdAt)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="body2"
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              mt: 0.5
                            }}
                          >
                            {comment.content}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < comments.length - 1 && (
                      <Divider variant="inset" component="li" />
                    )}
                  </React.Fragment>
                ))}
              </List>

              {/* もっと見るボタン */}
              {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    variant="outlined"
                    startIcon={loadingMore ? <CircularProgress size={20} /> : <MoreIcon />}
                  >
                    {loadingMore ? '読み込み中...' : 'もっと見る'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Paper>
      </Collapse>

      {/* スナックバー（通知） */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
}
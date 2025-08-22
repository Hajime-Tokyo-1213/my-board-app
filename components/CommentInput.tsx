'use client';

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Avatar,
  Paper,
  Typography,
  LinearProgress,
  Collapse,
  Alert,
  IconButton,
  InputAdornment,
  Tooltip
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  Mood as MoodIcon,
  AttachFile as AttachFileIcon,
  FormatBold as FormatBoldIcon,
  FormatItalic as FormatItalicIcon,
  FormatUnderlined as FormatUnderlinedIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function CommentInput({
  onSubmit,
  maxLength = 500,
  placeholder = 'コメントを入力...',
  autoFocus = false,
  disabled = false
}: CommentInputProps) {
  const { data: session } = useSession();
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('コメントを入力してください');
      return;
    }

    if (content.length > maxLength) {
      setError(`コメントは${maxLength}文字以内で入力してください`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(content);
      setContent('');
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setContent('');
    setError(null);
  };

  const remainingChars = maxLength - content.length;
  const isOverLimit = remainingChars < 0;
  const isNearLimit = remainingChars <= 50;

  if (!session) {
    return (
      <Alert severity="info" variant="outlined">
        コメントを投稿するにはログインが必要です
      </Alert>
    );
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={focused ? 3 : 1}
      sx={{
        p: 2,
        transition: 'all 0.3s',
        borderRadius: 2
      }}
    >
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Avatar
          src={session.user?.image || undefined}
          alt={session.user?.name || ''}
          sx={{ 
            width: 44, 
            height: 44,
            border: '2px solid',
            borderColor: 'primary.main'
          }}
        >
          {session.user?.name?.[0] || <PersonIcon />}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={focused ? 3 : 2}
            variant="outlined"
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={submitting || disabled}
            error={!!error || isOverLimit}
            autoFocus={autoFocus}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                transition: 'all 0.3s'
              }
            }}
          />

          {/* 文字数カウンター */}
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography
              variant="caption"
              color={isOverLimit ? 'error' : isNearLimit ? 'warning.main' : 'text.secondary'}
            >
              {content.length} / {maxLength}
            </Typography>

            {isNearLimit && !isOverLimit && (
              <Typography variant="caption" color="warning.main">
                残り{remainingChars}文字
              </Typography>
            )}
          </Box>

          {/* プログレスバー */}
          <LinearProgress
            variant="determinate"
            value={Math.min((content.length / maxLength) * 100, 100)}
            color={isOverLimit ? 'error' : isNearLimit ? 'warning' : 'primary'}
            sx={{ mt: 1, height: 2, borderRadius: 1 }}
          />

          {/* エラーメッセージ */}
          <Collapse in={!!error}>
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          </Collapse>

          {/* アクションボタン */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            {/* フォーマットボタン（将来の拡張用） */}
            {focused && (
              <Box sx={{ display: 'flex', gap: 0.5, mr: 'auto' }}>
                <Tooltip title="太字">
                  <IconButton size="small" disabled>
                    <FormatBoldIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="斜体">
                  <IconButton size="small" disabled>
                    <FormatItalicIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="下線">
                  <IconButton size="small" disabled>
                    <FormatUnderlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="絵文字">
                  <IconButton size="small" disabled>
                    <MoodIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="ファイル添付">
                  <IconButton size="small" disabled>
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}

            <Button
              type="button"
              size="small"
              variant="outlined"
              onClick={handleClear}
              disabled={!content || submitting}
              startIcon={<ClearIcon />}
            >
              クリア
            </Button>

            <Button
              type="submit"
              size="small"
              variant="contained"
              disabled={submitting || !content.trim() || isOverLimit}
              endIcon={<SendIcon />}
              sx={{
                minWidth: 100,
                background: (theme) =>
                  submitting
                    ? theme.palette.action.disabled
                    : `linear-gradient(45deg, ${theme.palette.primary.main} 30%, ${theme.palette.primary.light} 90%)`,
                boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                '&:hover': {
                  boxShadow: '0 4px 8px 3px rgba(33, 150, 243, .4)'
                }
              }}
            >
              {submitting ? '送信中...' : '投稿'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 投稿中のローディング */}
      {submitting && (
        <LinearProgress
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            borderRadius: '0 0 8px 8px'
          }}
        />
      )}
    </Paper>
  );
}
'use client';

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Avatar,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Flag as FlagIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface CommentCardProps {
  comment: {
    _id: string;
    content: string;
    authorId: string;
    authorName: string;
    authorImage?: string;
    createdAt: string;
    updatedAt: string;
  };
  isOwner: boolean;
  onDelete: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onReport?: (id: string) => void;
}

export default function CommentCard({
  comment,
  isOwner,
  onDelete,
  onEdit,
  onReport
}: CommentCardProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(comment._id);
  };

  const handleEdit = () => {
    handleMenuClose();
    if (onEdit) {
      onEdit(comment._id, comment.content);
    }
  };

  const handleReport = () => {
    handleMenuClose();
    if (onReport) {
      onReport(comment._id);
    }
  };

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
    <Card
      variant="outlined"
      sx={{
        mb: 2,
        transition: 'all 0.3s',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)'
        }
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar
            src={comment.authorImage || undefined}
            alt={comment.authorName}
            sx={{ width: 40, height: 40 }}
          >
            {comment.authorName[0] || <PersonIcon />}
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {comment.authorName}
              </Typography>
              {isOwner && (
                <Chip 
                  label="あなた" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                {formatTime(comment.createdAt)}
              </Typography>
              {comment.updatedAt !== comment.createdAt && (
                <Typography variant="caption" color="text.secondary">
                  (編集済み)
                </Typography>
              )}
            </Box>
            
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {comment.content}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={handleMenuOpen}
            sx={{
              opacity: 0.7,
              '&:hover': {
                opacity: 1
              }
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {isOwner && onEdit && (
            <MenuItem onClick={handleEdit}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>編集</ListItemText>
            </MenuItem>
          )}
          {isOwner && (
            <MenuItem onClick={handleDelete}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>削除</ListItemText>
            </MenuItem>
          )}
          {!isOwner && onReport && (
            <MenuItem onClick={handleReport}>
              <ListItemIcon>
                <FlagIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>報告</ListItemText>
            </MenuItem>
          )}
        </Menu>
      </CardContent>
    </Card>
  );
}
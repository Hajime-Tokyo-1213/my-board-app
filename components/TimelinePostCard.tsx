'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ChatBubbleOutline as CommentIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import UserAvatar from '@/components/UserAvatar';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface TimelinePostCardProps {
  id: string;
  title?: string;
  content: string;
  userId: string;
  userName: string;
  userEmail: string;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  onLike?: (postId: string) => void;
  onComment?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, content: string) => void;
  onUserClick?: (userId: string) => void;
}

export default function TimelinePostCard({
  id,
  title,
  content,
  userId,
  userName,
  userEmail,
  createdAt,
  updatedAt,
  likesCount,
  commentsCount,
  isLiked,
  onLike,
  onComment,
  onDelete,
  onEdit,
  onUserClick,
}: TimelinePostCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [liked, setLiked] = useState(isLiked);
  const [likeCount, setLikeCount] = useState(likesCount);
  const [isLiking, setIsLiking] = useState(false);

  const isOwner = session?.user?.id === userId;

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLike = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const response = await fetch(`/api/posts/${id}/like`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setLiked(data.liked);
        setLikeCount(data.likesCount);
        if (onLike) onLike(id);
      }
    } catch (error) {
      console.error('いいねエラー:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = () => {
    router.push(`/posts/${id}`);
  };

  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) onDelete(id);
  };

  const handleEdit = () => {
    handleMenuClose();
    router.push(`/posts/${id}/edit`);
  };

  const handleUserClick = () => {
    if (onUserClick) onUserClick(userId);
  };

  const formatDate = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ja,
    });
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box 
            sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}
            onClick={handleUserClick}
          >
            <UserAvatar name={userName} size={40} />
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDate(createdAt)}
                {createdAt !== updatedAt && ' (編集済み)'}
              </Typography>
            </Box>
          </Box>
          
          {isOwner && (
            <>
              <IconButton size="small" onClick={handleMenuClick}>
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleEdit}>
                  <EditIcon fontSize="small" sx={{ mr: 1 }} />
                  編集
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                  <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                  削除
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>

        {title && (
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 2 }}>
            {title}
          </Typography>
        )}

        <Typography 
          variant="body1" 
          sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            mb: 2,
          }}
        >
          {content}
        </Typography>
      </CardContent>

      <Divider />

      <CardActions sx={{ px: 2, py: 1 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton 
              onClick={handleLike}
              color={liked ? 'error' : 'default'}
              disabled={isLiking}
              size="small"
            >
              {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {likeCount}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={handleComment} size="small">
              <CommentIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {commentsCount}
            </Typography>
          </Box>
        </Box>
      </CardActions>
    </Card>
  );
}
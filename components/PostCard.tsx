'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Button,
  Stack,
  Chip,
  Avatar,
  ImageList,
  ImageListItem,
  Skeleton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import CommentIcon from '@mui/icons-material/Comment';
import UserAvatar from '@/components/UserAvatar';
import { HashtagLink, HashtagChips } from '@/components/HashtagLink';
import OptimizedImage from './OptimizedImage';

interface PostCardProps {
  post: {
    _id: string;
    title: string;
    content: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    authorImage?: string | null;
    createdAt: string;
    updatedAt: string;
    likes?: string[];
    likesCount?: number;
    commentsCount?: number;
    hashtags?: string[];
    images?: {
      id: string;
      url: string;
      thumbnailUrl: string;
      mediumUrl: string;
      largeUrl: string;
    }[];
  };
  onDelete: (id: string) => void;
  onUpdate: (id: string, title: string, content: string) => void;
  currentUserId?: string;
  onUserClick?: (userId: string) => void;
}

export default function PostCard({ post, onDelete, onUpdate, currentUserId, onUserClick }: PostCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  
  // 投稿者が現在のユーザーかどうかを判定
  const isOwner = currentUserId && post.authorId === currentUserId;

  // いいね状態を初期化
  useEffect(() => {
    if (post.likes && currentUserId) {
      setIsLiked(post.likes.includes(currentUserId));
    }
    setLikesCount(post.likesCount || 0);
  }, [post.likes, post.likesCount, currentUserId]);

  const handleLike = async () => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (isLiking) return;
    
    setIsLiking(true);
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        setIsLiked(data.liked);
        setLikesCount(data.likesCount);
      } else {
        console.error('Failed to like post:', response.status, data);
        alert(data.error || 'いいねの処理に失敗しました');
      }
    } catch (error) {
      console.error('Error liking post:', error);
    } finally {
      setIsLiking(false);
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card 
      sx={{ 
        mb: 2,
        '&:hover': {
          boxShadow: 3,
        },
        transition: 'box-shadow 0.3s ease-in-out',
      }}
    >
      <CardContent>
        <Box>
          {/* タイトル */}
          <Box sx={{ mb: 1 }}>
            <HashtagLink text={post.title} variant="h6" />
          </Box>
          
          {/* 投稿者情報 */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            {post.authorImage ? (
              <Avatar 
                src={post.authorImage}
                alt={post.authorName}
                sx={{ 
                  width: 32, 
                  height: 32, 
                  mr: 1,
                  cursor: onUserClick ? 'pointer' : 'default',
                  '&:hover': onUserClick ? {
                    opacity: 0.8,
                  } : {},
                }}
                onClick={() => onUserClick && onUserClick(post.authorId)}
              />
            ) : (
              <Box
                sx={{ 
                  mr: 1,
                  cursor: onUserClick ? 'pointer' : 'default',
                }}
                onClick={() => onUserClick && onUserClick(post.authorId)}
              >
                <UserAvatar name={post.authorName} size={32} />
              </Box>
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  cursor: onUserClick ? 'pointer' : 'default',
                  display: 'inline-block',
                  '&:hover': onUserClick ? {
                    textDecoration: 'underline',
                  } : {},
                }}
                onClick={() => onUserClick && onUserClick(post.authorId)}
              >
                {post.authorName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {formatDate(post.createdAt)}
                {post.updatedAt !== post.createdAt && ' (編集済み)'}
              </Typography>
            </Box>
            {isOwner && (
              <Chip 
                label="あなたの投稿" 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            )}
          </Box>

          {/* 投稿内容 */}
          <Box sx={{ mb: 2 }}>
            <HashtagLink 
              text={post.content} 
              variant="body1" 
              color="text.secondary"
              maxLines={3}
            />
          </Box>

          {/* 画像表示 - 最適化済み */}
          {post.images && post.images.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <ImageList 
                sx={{ width: '100%', height: 'auto' }} 
                cols={post.images.length === 1 ? 1 : 2} 
                gap={8}
              >
                {post.images.map((image, index) => (
                  <ImageListItem key={image.id}>
                    <Box
                      sx={{
                        cursor: 'pointer',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        width: '100%',
                        maxHeight: '400px',
                        position: 'relative',
                      }}
                      onClick={() => window.open(image.largeUrl || image.url, '_blank')}
                    >
                      <OptimizedImage
                        src={image.mediumUrl || image.url}
                        alt={`投稿画像 ${index + 1}`}
                        aspectRatio="16/9"
                        transformation="medium"
                        enableLazyLoad={true}
                        showSkeleton={true}
                        sizes={post.images.length === 1 ? "100vw" : "50vw"}
                      />
                    </Box>
                  </ImageListItem>
                ))}
              </ImageList>
            </Box>
          )}

          {/* アクション */}
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton
              size="small"
              onClick={handleLike}
              disabled={isLiking}
              color={isLiked ? "error" : "default"}
            >
              {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {likesCount}
            </Typography>
            
            <IconButton
              size="small"
              onClick={() => router.push(`/posts/${post._id}`)}
            >
              <CommentIcon />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              {post.commentsCount || 0}
            </Typography>
            
            <Button
              size="small"
              startIcon={<VisibilityIcon />}
              onClick={() => router.push(`/posts/${post._id}`)}
            >
              詳細を見る
            </Button>
            
            {isOwner && (
              <>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => router.push(`/posts/${post._id}/edit`)}
                  color="primary"
                >
                  編集
                </Button>
                <IconButton
                  aria-label="削除"
                  size="small"
                  onClick={() => onDelete(post._id)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </>
            )}
          </Stack>
        </Box>
        
        {/* ハッシュタグ表示 */}
        {post.hashtags && post.hashtags.length > 0 && (
          <HashtagChips hashtags={post.hashtags} size="small" />
        )}
      </CardContent>
    </Card>
  );
}
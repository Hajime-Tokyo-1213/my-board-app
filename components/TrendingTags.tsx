'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Fade,
  Zoom,
} from '@mui/material';
import {
  TrendingUp,
  Tag as TagIcon,
  Refresh,
  LocalFireDepartment,
  ShowChart,
  Schedule,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface TrendingTag {
  name: string;
  count: number;
  trend: 'up' | 'down' | 'stable';
  growth: number;
  lastUsed?: string;
  topUsers?: { name: string; image?: string }[];
}

interface TrendingTagsProps {
  title?: string;
  limit?: number;
  showGrowth?: boolean;
  compact?: boolean;
}

const TrendingTags: React.FC<TrendingTagsProps> = ({
  title = 'トレンドタグ',
  limit = 10,
  showGrowth = true,
  compact = false,
}) => {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  const fetchTrendingTags = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/hashtags?type=trending&limit=${limit}&timeRange=${timeRange}`
      );
      if (response.ok) {
        const data = await response.json();
        // ダミーデータで拡張（実際のAPIで実装する場合は削除）
        const enrichedTags = (data.hashtags || []).map((tag: any, index: number) => ({
          ...tag,
          trend: index < 3 ? 'up' : index > 6 ? 'down' : 'stable',
          growth: Math.floor(Math.random() * 200 - 50),
          topUsers: [
            { name: 'User1', image: undefined },
            { name: 'User2', image: undefined },
          ],
        }));
        setTags(enrichedTags);
      }
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingTags();
  }, [limit, timeRange]);

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpward sx={{ fontSize: 16, color: 'success.main' }} />;
      case 'down':
        return <ArrowDownward sx={{ fontSize: 16, color: 'error.main' }} />;
      default:
        return <ShowChart sx={{ fontSize: 16, color: 'text.secondary' }} />;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) {
      return (
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'gold', color: 'white' }}>
          👑
        </Avatar>
      );
    }
    if (rank === 1) {
      return (
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'silver', color: 'white' }}>
          🥈
        </Avatar>
      );
    }
    if (rank === 2) {
      return (
        <Avatar sx={{ width: 30, height: 30, bgcolor: '#CD7F32', color: 'white' }}>
          🥉
        </Avatar>
      );
    }
    return (
      <Avatar sx={{ width: 30, height: 30, bgcolor: 'grey.300' }}>
        <Typography variant="caption" fontWeight="bold">
          {rank + 1}
        </Typography>
      </Avatar>
    );
  };

  if (compact) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalFireDepartment sx={{ color: 'white' }} />
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
              急上昇
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {loading ? (
            [...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" width={80} height={24} />
            ))
          ) : (
            tags.slice(0, 5).map((tag) => (
              <Chip
                key={tag.name}
                component={Link}
                href={`/search?tag=${encodeURIComponent(tag.name)}`}
                label={`#${tag.name}`}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                  fontWeight: 'bold',
                }}
              />
            ))
          )}
        </Box>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        background: 'linear-gradient(to bottom, #ffffff, #f8f9fa)',
      }}
    >
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp />
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="更新">
              <IconButton size="small" onClick={fetchTrendingTags} sx={{ color: 'white' }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>

      <List sx={{ py: 0 }}>
        {loading ? (
          [...Array(5)].map((_, index) => (
            <ListItem key={index}>
              <Skeleton variant="rectangular" width="100%" height={60} />
            </ListItem>
          ))
        ) : tags.length === 0 ? (
          <ListItem>
            <ListItemText
              primary={
                <Typography variant="body2" color="text.secondary" align="center">
                  トレンドタグがありません
                </Typography>
              }
            />
          </ListItem>
        ) : (
          tags.map((tag, index) => (
            <Fade in={true} timeout={300 + index * 100} key={tag.name}>
              <ListItemButton
                component={Link}
                href={`/search?tag=${encodeURIComponent(tag.name)}`}
                sx={{
                  py: 1.5,
                  borderBottom: index < tags.length - 1 ? '1px solid' : 'none',
                  borderColor: 'divider',
                  transition: 'all 0.3s',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getRankIcon(index)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        #{tag.name}
                      </Typography>
                      {showGrowth && getTrendIcon(tag.trend)}
                      {tag.trend === 'up' && tag.growth > 100 && (
                        <Zoom in={true}>
                          <LocalFireDepartment sx={{ fontSize: 16, color: 'error.main' }} />
                        </Zoom>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {tag.count}件の投稿
                      </Typography>
                      {showGrowth && tag.growth !== 0 && (
                        <Chip
                          label={`${tag.growth > 0 ? '+' : ''}${tag.growth}%`}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.7rem',
                            backgroundColor:
                              tag.growth > 0
                                ? 'success.light'
                                : tag.growth < 0
                                ? 'error.light'
                                : 'grey.300',
                            color: 'white',
                          }}
                        />
                      )}
                      {tag.lastUsed && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Schedule sx={{ fontSize: 12 }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(tag.lastUsed), {
                              addSuffix: true,
                              locale: ja,
                            })}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                {tag.growth > 0 && (
                  <Box sx={{ width: 60 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(tag.growth, 100)}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: 'success.main',
                        },
                      }}
                    />
                  </Box>
                )}
              </ListItemButton>
            </Fade>
          ))
        )}
      </List>
    </Paper>
  );
};

export default TrendingTags;
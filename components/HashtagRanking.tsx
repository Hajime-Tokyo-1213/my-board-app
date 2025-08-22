'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  Box,
  Skeleton,
  IconButton,
  Fade,
} from '@mui/material';
import {
  TrendingUp,
  Tag as TagIcon,
  Refresh,
} from '@mui/icons-material';
import Link from 'next/link';

interface Hashtag {
  name: string;
  count: number;
}

const HashtagRanking: React.FC = () => {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHashtags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/hashtags?type=popular&limit=10');
      if (response.ok) {
        const data = await response.json();
        setHashtags(data.hashtags);
      }
    } catch (error) {
      console.error('Error fetching hashtags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHashtags();
  }, []);

  const getTagColor = (index: number): 'error' | 'warning' | 'info' | 'default' => {
    if (index === 0) return 'error';
    if (index === 1) return 'warning';
    if (index === 2) return 'info';
    return 'default';
  };

  const getTagSize = (index: number): 'medium' | 'small' => {
    return index < 3 ? 'medium' : 'small';
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
            トレンドタグ
          </Typography>
        </Box>
        <IconButton size="small" onClick={fetchHashtags} sx={{ color: 'white' }}>
          <Refresh />
        </IconButton>
      </Box>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <List sx={{ py: 0 }}>
          {loading ? (
            [...Array(5)].map((_, index) => (
              <ListItem key={index} sx={{ py: 1 }}>
                <Skeleton variant="rectangular" width="100%" height={40} />
              </ListItem>
            ))
          ) : hashtags.length === 0 ? (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    まだタグがありません
                  </Typography>
                }
              />
            </ListItem>
          ) : (
            hashtags.map((hashtag, index) => (
              <Fade in={true} timeout={300 + index * 100} key={hashtag.name}>
                <ListItemButton
                  component={Link}
                  href={`/search?tag=${encodeURIComponent(hashtag.name)}`}
                  sx={{
                    transition: 'all 0.3s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        minWidth: 30,
                        fontWeight: 'bold',
                        color: index < 3 ? 'primary.main' : 'text.secondary',
                      }}
                    >
                      {index + 1}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TagIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: index < 3 ? 'bold' : 'normal',
                            color: 'text.primary',
                          }}
                        >
                          #{hashtag.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={`${hashtag.count}件`}
                      size={getTagSize(index)}
                      color={getTagColor(index)}
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </ListItemButton>
              </Fade>
            ))
          )}
        </List>
      </Paper>
    </Paper>
  );
};

export default HashtagRanking;
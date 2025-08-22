'use client';

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  Fade,
  Grid,
} from '@mui/material';
import {
  CloudQueue,
  Refresh,
  TrendingUp,
} from '@mui/icons-material';
import Link from 'next/link';

interface Tag {
  name: string;
  count: number;
}

interface TagCloudProps {
  title?: string;
  limit?: number;
  minFontSize?: number;
  maxFontSize?: number;
}

const TagCloud: React.FC<TagCloudProps> = ({
  title = 'タグクラウド',
  limit = 30,
  minFontSize = 12,
  maxFontSize = 32,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/hashtags?type=popular&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.hashtags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [limit]);

  // タグのサイズを計算（使用回数に基づく）
  const calculateFontSize = (count: number): number => {
    if (tags.length === 0) return minFontSize;
    
    const maxCount = Math.max(...tags.map(t => t.count));
    const minCount = Math.min(...tags.map(t => t.count));
    
    if (maxCount === minCount) return (minFontSize + maxFontSize) / 2;
    
    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  };

  // タグの色を計算（使用回数に基づく）
  const getTagColor = (count: number): string => {
    if (tags.length === 0) return '#667eea';
    
    const maxCount = Math.max(...tags.map(t => t.count));
    const ratio = count / maxCount;
    
    if (ratio > 0.8) return '#667eea'; // 濃い紫
    if (ratio > 0.6) return '#764ba2'; // 紫
    if (ratio > 0.4) return '#9775fa'; // 薄紫
    if (ratio > 0.2) return '#b197fc'; // さらに薄紫
    return '#d0bfff'; // 最も薄紫
  };

  // タグの不透明度を計算
  const getTagOpacity = (count: number): number => {
    if (tags.length === 0) return 1;
    
    const maxCount = Math.max(...tags.map(t => t.count));
    const ratio = count / maxCount;
    
    return 0.6 + ratio * 0.4; // 0.6〜1.0の範囲
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景の装飾 */}
      <CloudQueue
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          fontSize: 150,
          opacity: 0.1,
          transform: 'rotate(15deg)',
        }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            {title}
          </Typography>
        </Box>
        <Tooltip title="更新">
          <IconButton size="small" onClick={fetchTags} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {loading ? (
          <Grid container spacing={1} justifyContent="center">
            {[...Array(15)].map((_, index) => (
              <Grid item key={index}>
                <Skeleton
                  variant="rounded"
                  width={60 + Math.random() * 60}
                  height={24 + Math.random() * 16}
                  sx={{ borderRadius: 2 }}
                />
              </Grid>
            ))}
          </Grid>
        ) : tags.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            まだタグがありません
          </Typography>
        ) : (
          tags.map((tag, index) => (
            <Fade in={true} timeout={300 + index * 50} key={tag.name}>
              <Link
                href={`/search?tag=${encodeURIComponent(tag.name)}`}
                style={{ textDecoration: 'none' }}
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    fontSize: `${calculateFontSize(tag.count)}px`,
                    fontWeight: tag.count > 10 ? 'bold' : 'normal',
                    color: getTagColor(tag.count),
                    opacity: getTagOpacity(tag.count),
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      opacity: 1,
                      textShadow: '0 2px 8px rgba(102, 126, 234, 0.4)',
                    },
                  }}
                >
                  #{tag.name}
                </Box>
              </Link>
            </Fade>
          ))
        )}
      </Box>

      {!loading && tags.length > 0 && (
        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
          <Typography variant="caption" color="text.secondary" align="center" display="block">
            {tags.length}個のタグを表示中 • クリックして検索
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TagCloud;
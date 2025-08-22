'use client';

import React from 'react';
import Link from 'next/link';
import { Chip, Typography, Box } from '@mui/material';
import { Tag as TagIcon } from '@mui/icons-material';
import { parseTextWithHashtags, createHashtagSearchUrl } from '@/app/utils/hashtag';

interface HashtagLinkProps {
  text: string;
  variant?: 'body1' | 'body2' | 'caption' | 'h6';
  color?: string;
  maxLines?: number;
  showAsChips?: boolean;
}

/**
 * テキスト内のハッシュタグをクリック可能なリンクに変換
 */
export const HashtagLink: React.FC<HashtagLinkProps> = ({
  text,
  variant = 'body2',
  color = 'text.primary',
  maxLines,
  showAsChips = false,
}) => {
  const parts = parseTextWithHashtags(text);

  if (parts.length === 0) {
    return <Typography variant={variant} color={color}>{text}</Typography>;
  }

  return (
    <Typography
      variant={variant}
      color={color}
      component="div"
      sx={{
        ...(maxLines && {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
        }),
      }}
    >
      {parts.map((part) => {
        if (part.type === 'hashtag') {
          const tag = part.value.substring(1); // Remove #
          const url = createHashtagSearchUrl(tag);

          if (showAsChips) {
            return (
              <Chip
                key={part.key}
                component={Link}
                href={url}
                label={part.value}
                size="small"
                icon={<TagIcon />}
                clickable
                sx={{
                  mx: 0.5,
                  backgroundColor: 'primary.light',
                  color: 'white',
                  '& .MuiChip-icon': {
                    color: 'white',
                  },
                  '&:hover': {
                    backgroundColor: 'primary.main',
                    transform: 'scale(1.05)',
                  },
                  transition: 'all 0.2s',
                  textDecoration: 'none',
                }}
              />
            );
          }

          return (
            <Link
              key={part.key}
              href={url}
              style={{
                color: '#667eea',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </Link>
          );
        }

        return <span key={part.key}>{part.value}</span>;
      })}
    </Typography>
  );
};

interface HashtagChipsProps {
  hashtags: string[];
  size?: 'small' | 'medium';
  maxTags?: number;
}

/**
 * ハッシュタグの配列をチップとして表示
 */
export const HashtagChips: React.FC<HashtagChipsProps> = ({
  hashtags,
  size = 'small',
  maxTags = 5,
}) => {
  const displayTags = hashtags.slice(0, maxTags);
  const remainingCount = hashtags.length - maxTags;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
      {displayTags.map((tag) => {
        const cleanTag = tag.replace(/^#/, '');
        const url = createHashtagSearchUrl(cleanTag);

        return (
          <Chip
            key={tag}
            component={Link}
            href={url}
            label={`#${cleanTag}`}
            size={size}
            icon={<TagIcon />}
            clickable
            sx={{
              backgroundColor: 'primary.light',
              color: 'white',
              '& .MuiChip-icon': {
                color: 'white',
                fontSize: size === 'small' ? 14 : 16,
              },
              '&:hover': {
                backgroundColor: 'primary.main',
                transform: 'scale(1.05)',
              },
              transition: 'all 0.2s',
              textDecoration: 'none',
            }}
            onClick={(e) => e.stopPropagation()}
          />
        );
      })}
      {remainingCount > 0 && (
        <Chip
          label={`+${remainingCount}`}
          size={size}
          sx={{
            backgroundColor: 'grey.300',
            color: 'text.secondary',
          }}
        />
      )}
    </Box>
  );
};
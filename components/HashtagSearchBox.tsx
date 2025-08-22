'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TextField,
  Autocomplete,
  Paper,
  Box,
  Typography,
  InputAdornment,
  IconButton,
  Chip,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Tag as TagIcon,
  TrendingUp,
  History,
  Clear,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';

interface HashtagOption {
  name: string;
  count: number;
  type: 'popular' | 'recent' | 'search';
}

interface HashtagSearchBoxProps {
  placeholder?: string;
  onSearch?: (tag: string) => void;
  showTrending?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

const HashtagSearchBox: React.FC<HashtagSearchBoxProps> = ({
  placeholder = 'ハッシュタグを検索...',
  onSearch,
  showTrending = true,
  fullWidth = true,
  size = 'medium',
}) => {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<HashtagOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [trendingTags, setTrendingTags] = useState<HashtagOption[]>([]);

  // ローカルストレージから最近の検索を読み込み
  useEffect(() => {
    const stored = localStorage.getItem('recentHashtagSearches');
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
    fetchTrendingTags();
  }, []);

  // トレンドタグを取得
  const fetchTrendingTags = async () => {
    try {
      const response = await fetch('/api/hashtags?type=popular&limit=5');
      if (response.ok) {
        const data = await response.json();
        setTrendingTags(
          (data.hashtags || []).map((tag: any) => ({
            ...tag,
            type: 'popular' as const,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching trending tags:', error);
    }
  };

  // 検索候補を取得
  const fetchSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 1) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/hashtags?type=search&q=${encodeURIComponent(query)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          const searchResults = (data.hashtags || []).map((tag: any) => ({
            ...tag,
            type: 'search' as const,
          }));

          // 最近の検索と検索結果を組み合わせ
          const recentMatches = recentSearches
            .filter(r => r.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 3)
            .map(r => ({
              name: r,
              count: 0,
              type: 'recent' as const,
            }));

          setOptions([...recentMatches, ...searchResults]);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    [recentSearches]
  );

  // 入力値が変更されたとき
  const handleInputChange = (event: any, newValue: string) => {
    setInputValue(newValue);
    
    // #で始まるように調整
    const cleanValue = newValue.replace(/^#*/, '');
    if (cleanValue) {
      fetchSuggestions(cleanValue);
    } else {
      // 入力が空の場合はトレンドタグを表示
      setOptions(trendingTags);
    }
  };

  // タグを選択したとき
  const handleSelect = (event: any, value: HashtagOption | null) => {
    if (value && value.name) {
      const tag = value.name.replace(/^#*/, '');
      
      // 最近の検索に追加
      const newRecent = [tag, ...recentSearches.filter(r => r !== tag)].slice(0, 10);
      setRecentSearches(newRecent);
      localStorage.setItem('recentHashtagSearches', JSON.stringify(newRecent));

      // 検索実行
      if (onSearch) {
        onSearch(tag);
      } else {
        router.push(`/search?tag=${encodeURIComponent(tag)}`);
      }
      
      setInputValue('');
      setOptions([]);
    }
  };

  // Enter キーで検索
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && inputValue) {
      const tag = inputValue.replace(/^#*/, '');
      handleSelect(null, { name: tag, count: 0, type: 'search' });
    }
  };

  // 最近の検索をクリア
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentHashtagSearches');
  };

  // オプションのアイコンを取得
  const getOptionIcon = (option: HashtagOption) => {
    switch (option.type) {
      case 'popular':
        return <TrendingUp color="error" fontSize="small" />;
      case 'recent':
        return <History color="action" fontSize="small" />;
      default:
        return <TagIcon color="primary" fontSize="small" />;
    }
  };

  return (
    <Autocomplete
      freeSolo
      fullWidth={fullWidth}
      size={size}
      options={options}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onChange={handleSelect}
      loading={loading}
      loadingText="検索中..."
      noOptionsText="候補が見つかりません"
      getOptionLabel={(option) => 
        typeof option === 'string' ? option : `#${option.name}`
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              backgroundColor: 'background.paper',
            },
          }}
        />
      )}
      renderOption={(props, option, state) => {
        const { key, ...otherProps } = props as any;
        return (
          <ListItem {...otherProps} key={key} component="li">
            <ListItemIcon sx={{ minWidth: 36 }}>
              {getOptionIcon(option)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    #{option.name}
                  </Typography>
                  {option.count > 0 && (
                    <Chip
                      label={`${option.count}件`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
              }
              secondary={
                option.type === 'popular' ? '人気' :
                option.type === 'recent' ? '最近の検索' :
                '検索結果'
              }
            />
          </ListItem>
        );
      }}
      PaperComponent={(props) => (
        <Paper {...props} elevation={4} sx={{ mt: 1, borderRadius: 2 }}>
          {props.children}
          {showTrending && inputValue === '' && trendingTags.length > 0 && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                トレンドタグ
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {trendingTags.map((tag) => (
                  <Chip
                    key={tag.name}
                    label={`#${tag.name}`}
                    size="small"
                    icon={<TrendingUp />}
                    onClick={() => handleSelect(null, tag)}
                    sx={{
                      backgroundColor: 'primary.light',
                      color: 'white',
                      '& .MuiChip-icon': { color: 'white' },
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {recentSearches.length > 0 && inputValue === '' && (
            <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  最近の検索
                </Typography>
                <IconButton size="small" onClick={clearRecentSearches}>
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {recentSearches.slice(0, 5).map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    icon={<History />}
                    variant="outlined"
                    onClick={() => handleSelect(null, { name: tag, count: 0, type: 'recent' })}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    />
  );
};

export default HashtagSearchBox;
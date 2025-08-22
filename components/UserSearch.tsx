'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Divider,
  Button,
  ButtonGroup,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  CardActions,
  Fade,
  Popper,
  ClickAwayListener,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Person as PersonIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface UserSearchResult {
  _id: string;
  name: string;
  username?: string;
  displayName?: string;
  email: string;
  bio?: string;
  avatar?: string;
  profileImage?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  score?: number;
}

interface SearchSuggestion {
  type: 'user' | 'query' | 'history';
  value: string;
  metadata?: {
    userId?: string;
    username?: string;
    profileImage?: string;
    followersCount?: number;
  };
}

interface RecommendedUser {
  user: UserSearchResult;
  reason: string;
  score: number;
}

export default function UserSearch() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<RecommendedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [searchType, setSearchType] = useState<'all' | 'name' | 'username' | 'bio'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'popularity' | 'recent'>('relevance');
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout>();

  // 検索実行
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        type: searchType,
        sort: sortBy,
        limit: '20',
      });

      const response = await fetch(`/api/users/search?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users);
        
        // 検索履歴に保存
        await fetch('/api/users/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [searchType, sortBy]);

  // サジェスト取得
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setSuggestionsLoading(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '5',
        includeHistory: 'true',
      });

      const response = await fetch(`/api/users/suggestions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Suggestions error:', error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  // おすすめユーザー取得
  const fetchRecommendedUsers = useCallback(async (type: string = 'similar') => {
    try {
      const params = new URLSearchParams({
        type,
        limit: '10',
        excludeFollowing: 'false',
      });

      const response = await fetch(`/api/users/recommended?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendedUsers(data.users);
      }
    } catch (error) {
      console.error('Recommended users error:', error);
    }
  }, []);

  // 入力変更時の処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // デバウンス処理
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (value.trim()) {
      suggestionsTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 検索実行
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    performSearch(searchQuery);
    setShowSuggestions(false);
  };

  // サジェスト選択
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'user' && suggestion.metadata?.userId) {
      router.push(`/users/${suggestion.metadata.userId}`);
    } else {
      setSearchQuery(suggestion.value);
      performSearch(suggestion.value);
    }
    setShowSuggestions(false);
  };

  // フォロー/アンフォロー
  const handleFollow = async (userId: string, isFollowing: boolean) => {
    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        // 結果を更新
        setSearchResults(prev => prev.map(user => 
          user._id === userId 
            ? { ...user, isFollowing: !isFollowing }
            : user
        ));
        
        setRecommendedUsers(prev => prev.map(rec =>
          rec.user._id === userId
            ? { ...rec, user: { ...rec.user, isFollowing: !isFollowing } }
            : rec
        ));
      }
    } catch (error) {
      console.error('Follow error:', error);
    }
  };

  // 初期データ取得
  useEffect(() => {
    fetchRecommendedUsers('similar');
  }, [fetchRecommendedUsers]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      {/* 検索ボックス */}
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <form onSubmit={handleSearch}>
          <TextField
            ref={searchInputRef}
            fullWidth
            variant="outlined"
            placeholder="ユーザーを検索（名前、ユーザー名、自己紹介）"
            value={searchQuery}
            onChange={handleInputChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loading && <CircularProgress size={20} />}
                  {searchQuery && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setSuggestions([]);
                        setShowSuggestions(false);
                      }}
                    >
                      <ClearIcon />
                    </IconButton>
                  )}
                </InputAdornment>
              ),
            }}
          />
        </form>

        {/* サジェスト */}
        <Popper
          open={showSuggestions && suggestions.length > 0}
          anchorEl={searchInputRef.current}
          placement="bottom-start"
          style={{ width: searchInputRef.current?.offsetWidth, zIndex: 1300 }}
        >
          <ClickAwayListener onClickAway={() => setShowSuggestions(false)}>
            <Paper elevation={8} sx={{ mt: 1 }}>
              <List dense>
                {suggestions.map((suggestion, index) => (
                  <ListItem
                    key={index}
                    button
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <ListItemAvatar>
                      {suggestion.type === 'user' ? (
                        <Avatar src={suggestion.metadata?.profileImage}>
                          <PersonIcon />
                        </Avatar>
                      ) : suggestion.type === 'history' ? (
                        <Avatar sx={{ bgcolor: 'grey.300' }}>
                          <HistoryIcon />
                        </Avatar>
                      ) : (
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <SearchIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={suggestion.value}
                      secondary={
                        suggestion.type === 'user' && suggestion.metadata?.username
                          ? `@${suggestion.metadata.username}`
                          : suggestion.type === 'history'
                          ? '検索履歴'
                          : '検索候補'
                      }
                    />
                    {suggestion.metadata?.followersCount !== undefined && (
                      <Typography variant="caption" color="text.secondary">
                        {suggestion.metadata.followersCount} フォロワー
                      </Typography>
                    )}
                  </ListItem>
                ))}
              </List>
            </Paper>
          </ClickAwayListener>
        </Popper>

        {/* 検索オプション */}
        {searchQuery && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => setSearchType('all')}
                variant={searchType === 'all' ? 'contained' : 'outlined'}
              >
                すべて
              </Button>
              <Button
                onClick={() => setSearchType('name')}
                variant={searchType === 'name' ? 'contained' : 'outlined'}
              >
                名前
              </Button>
              <Button
                onClick={() => setSearchType('username')}
                variant={searchType === 'username' ? 'contained' : 'outlined'}
              >
                ユーザー名
              </Button>
              <Button
                onClick={() => setSearchType('bio')}
                variant={searchType === 'bio' ? 'contained' : 'outlined'}
              >
                自己紹介
              </Button>
            </ButtonGroup>

            <ButtonGroup size="small" variant="outlined">
              <Button
                onClick={() => setSortBy('relevance')}
                variant={sortBy === 'relevance' ? 'contained' : 'outlined'}
              >
                関連性
              </Button>
              <Button
                onClick={() => setSortBy('popularity')}
                variant={sortBy === 'popularity' ? 'contained' : 'outlined'}
              >
                人気順
              </Button>
              <Button
                onClick={() => setSortBy('recent')}
                variant={sortBy === 'recent' ? 'contained' : 'outlined'}
              >
                新着順
              </Button>
            </ButtonGroup>
          </Box>
        )}
      </Paper>

      {/* タブ */}
      <Tabs
        value={tabValue}
        onChange={(e, newValue) => setTabValue(newValue)}
        sx={{ mb: 2 }}
      >
        <Tab label="検索結果" />
        <Tab label="おすすめユーザー" />
      </Tabs>

      {/* 検索結果 */}
      {tabValue === 0 && (
        <Box>
          {searchResults.length > 0 ? (
            <Grid container spacing={2}>
              {searchResults.map((user) => (
                <Grid item xs={12} md={6} key={user._id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={user.profileImage || user.avatar}
                          sx={{ width: 56, height: 56, mr: 2 }}
                        >
                          <PersonIcon />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div">
                            {user.displayName || user.name}
                          </Typography>
                          {user.username && (
                            <Typography variant="body2" color="text.secondary">
                              @{user.username}
                            </Typography>
                          )}
                        </Box>
                        {user.score !== undefined && (
                          <Chip
                            label={`${Math.round(user.score)}%`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      
                      {user.bio && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {user.bio}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography variant="caption">
                          <strong>{user.followersCount}</strong> フォロワー
                        </Typography>
                        <Typography variant="caption">
                          <strong>{user.followingCount}</strong> フォロー中
                        </Typography>
                        <Typography variant="caption">
                          <strong>{user.postsCount}</strong> 投稿
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => router.push(`/users/${user._id}`)}
                      >
                        プロフィール
                      </Button>
                      {session?.user?.id !== user._id && (
                        <Button
                          size="small"
                          variant={user.isFollowing ? 'outlined' : 'contained'}
                          startIcon={<PersonAddIcon />}
                          onClick={() => handleFollow(user._id, user.isFollowing)}
                        >
                          {user.isFollowing ? 'フォロー中' : 'フォロー'}
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : searchQuery && !loading ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              「{searchQuery}」に一致するユーザーが見つかりませんでした
            </Typography>
          ) : null}
        </Box>
      )}

      {/* おすすめユーザー */}
      {tabValue === 1 && (
        <Box>
          <ButtonGroup size="small" sx={{ mb: 2 }}>
            <Button onClick={() => fetchRecommendedUsers('similar')}>
              似ているユーザー
            </Button>
            <Button onClick={() => fetchRecommendedUsers('popular')}>
              人気ユーザー
            </Button>
            <Button onClick={() => fetchRecommendedUsers('active')}>
              アクティブ
            </Button>
            <Button onClick={() => fetchRecommendedUsers('new')}>
              新規ユーザー
            </Button>
          </ButtonGroup>

          <Grid container spacing={2}>
            {recommendedUsers.map((rec) => (
              <Grid item xs={12} md={6} key={rec.user._id}>
                <Card>
                  <CardContent>
                    <Chip
                      label={rec.reason}
                      size="small"
                      color="secondary"
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={rec.user.profileImage || rec.user.avatar}
                        sx={{ width: 56, height: 56, mr: 2 }}
                      >
                        <PersonIcon />
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" component="div">
                          {rec.user.displayName || rec.user.name}
                        </Typography>
                        {rec.user.username && (
                          <Typography variant="body2" color="text.secondary">
                            @{rec.user.username}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    
                    {rec.user.bio && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {rec.user.bio}
                      </Typography>
                    )}
                    
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Typography variant="caption">
                        <strong>{rec.user.followersCount}</strong> フォロワー
                      </Typography>
                      <Typography variant="caption">
                        <strong>{rec.user.followingCount}</strong> フォロー中
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => router.push(`/users/${rec.user._id}`)}
                    >
                      プロフィール
                    </Button>
                    {session?.user?.id !== rec.user._id && (
                      <Button
                        size="small"
                        variant={rec.user.isFollowing ? 'outlined' : 'contained'}
                        startIcon={<PersonAddIcon />}
                        onClick={() => handleFollow(rec.user._id, rec.user.isFollowing)}
                      >
                        {rec.user.isFollowing ? 'フォロー中' : 'フォロー'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
}
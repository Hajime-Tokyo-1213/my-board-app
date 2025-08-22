'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Paper,
  CircularProgress,
  Chip,
  Button,
  Grid,
  Fade,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import {
  Tag as TagIcon,
  ArrowBack,
  Search as SearchIcon,
  AccessTime,
  Whatshot,
  TrendingUp,
} from '@mui/icons-material';
import PostCard from '@/components/PostCard';
import HashtagSearchBox from '@/components/HashtagSearchBox';
import Link from 'next/link';

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorImage?: string;
  likes: string[];
  likesCount: number;
  commentsCount: number;
  hashtags: string[];
  createdAt: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tag = searchParams.get('tag');
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
  const [relatedTags, setRelatedTags] = useState<{ tag: string; count: number }[]>([]);

  useEffect(() => {
    if (!tag) {
      setError('検索するタグが指定されていません');
      setLoading(false);
      return;
    }

    fetchPosts();
  }, [tag, page, sortBy]);

  const fetchPosts = async () => {
    if (!tag) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `/api/hashtags/${encodeURIComponent(tag)}?page=${page}&limit=20&sortBy=${sortBy}`
      );
      
      if (!response.ok) {
        throw new Error('検索に失敗しました');
      }
      
      const data = await response.json();
      setPosts(data.posts);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.totalCount);
      setRelatedTags(data.relatedTags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '検索中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={() => router.push('/')}
        >
          ホームに戻る
        </Button>
      </Container>
    );
  }

  const handleSortChange = (event: React.MouseEvent<HTMLElement>, newSort: 'recent' | 'popular' | null) => {
    if (newSort !== null) {
      setSortBy(newSort);
      setPage(1);
    }
  };

  const handleTagSearch = (newTag: string) => {
    router.push(`/search?tag=${encodeURIComponent(newTag)}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* 検索ボックス */}
      <Box sx={{ mb: 3 }}>
        <HashtagSearchBox onSearch={handleTagSearch} />
      </Box>

      <Grid container spacing={3}>
        {/* メインコンテンツ */}
        <Grid item xs={12} md={8}>
          <Paper
            elevation={3}
            sx={{
              p: 3,
              mb: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <TagIcon sx={{ fontSize: 32 }} />
              <Typography variant="h4" fontWeight="bold">
                #{tag}
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {totalCount}件の投稿が見つかりました
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ArrowBack />}
                onClick={() => router.push('/')}
                sx={{
                  color: 'white',
                  borderColor: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                戻る
              </Button>
            </Box>
          </Paper>

          {/* ソートオプション */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={sortBy}
              exclusive
              onChange={handleSortChange}
              aria-label="並び替え"
              sx={{
                backgroundColor: 'background.paper',
                borderRadius: 2,
              }}
            >
              <ToggleButton value="recent" aria-label="最新順">
                <AccessTime sx={{ mr: 1 }} />
                最新順
              </ToggleButton>
              <ToggleButton value="popular" aria-label="人気順">
                <Whatshot sx={{ mr: 1 }} />
                人気順
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {loading && page === 1 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : posts.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SearchIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                このタグの投稿はまだありません
              </Typography>
            </Paper>
          ) : (
            <>
              {posts.map((post, index) => (
                <Fade in={true} timeout={300 + index * 50} key={post._id}>
                  <Box sx={{ mb: 2 }}>
                    <PostCard
                      post={{
                        _id: post._id,
                        title: post.title,
                        content: post.content,
                        authorId: post.authorId,
                        authorName: post.authorName,
                        authorEmail: post.authorEmail,
                        authorImage: post.authorImage,
                        createdAt: post.createdAt,
                        updatedAt: post.createdAt,
                        likes: post.likes,
                        likesCount: post.likesCount,
                        commentsCount: post.commentsCount,
                        hashtags: post.hashtags,
                      }}
                      onDelete={() => {}}
                      onUpdate={() => {}}
                    />
                  </Box>
                </Fade>
              ))}

              {page < totalPages && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                  <Button
                    variant="contained"
                    onClick={handleLoadMore}
                    disabled={loading}
                    size="large"
                  >
                    {loading ? <CircularProgress size={24} /> : 'もっと見る'}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Grid>

        {/* サイドバー */}
        <Grid item xs={12} md={4}>
          {/* 関連タグ */}
          {relatedTags.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  関連タグ
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {relatedTags.map((related) => (
                  <Chip
                    key={related.tag}
                    label={`#${related.tag}`}
                    size="small"
                    component={Link}
                    href={`/search?tag=${encodeURIComponent(related.tag)}`}
                    clickable
                    sx={{
                      backgroundColor: 'primary.light',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                    }}
                  />
                ))}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    }>
      <SearchContent />
    </Suspense>
  );
}
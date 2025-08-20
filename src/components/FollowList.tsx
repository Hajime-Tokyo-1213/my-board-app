'use client';

import React, { useState, useEffect } from 'react';
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Skeleton,
  Paper,
  Chip,
  IconButton,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import FollowButton from './FollowButton';
import { useSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  username?: string;
  email?: string;
  bio?: string;
  avatar?: string;
  followersCount: number;
  followingCount: number;
  isVerified?: boolean;
}

interface FollowListProps {
  userId?: string;
  type: 'followers' | 'following' | 'suggestions';
  limit?: number;
  showFollowButton?: boolean;
  onUserClick?: (user: User) => void;
  emptyMessage?: string;
  title?: string;
}

const FollowList: React.FC<FollowListProps> = ({
  userId,
  type,
  limit = 10,
  showFollowButton = true,
  onUserClick,
  emptyMessage,
  title,
}) => {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!userId && type !== 'suggestions') return;
      
      setLoading(true);
      setError(null);
      
      try {
        let url = '';
        if (type === 'followers') {
          url = `/api/sns/followers/${userId}?page=${page}&limit=${limit}`;
        } else if (type === 'following') {
          url = `/api/sns/following/${userId}?page=${page}&limit=${limit}`;
        } else if (type === 'suggestions') {
          url = `/api/sns/users/suggestions?limit=${limit}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        
        if (type === 'suggestions') {
          setUsers(data.users || []);
          setHasMore(false);
        } else {
          setUsers(data.data || []);
          setHasMore(data.pagination?.hasNext || false);
          setTotalCount(data.pagination?.total || 0);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [userId, type, page, limit]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const handleFollowChange = (targetUserId: string, isFollowing: boolean) => {
    // Update local state to reflect follow change
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === targetUserId
          ? { ...user, followersCount: user.followersCount + (isFollowing ? 1 : -1) }
          : user
      )
    );
  };

  if (loading && users.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2 }}>
        {title && (
          <>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        <List>
          {[...Array(3)].map((_, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemAvatar>
                <Skeleton variant="circular" width={40} height={40} />
              </ListItemAvatar>
              <ListItemText
                primary={<Skeleton variant="text" width="60%" />}
                secondary={<Skeleton variant="text" width="40%" />}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={0} sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  if (users.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 2 }}>
        {title && (
          <>
            <Typography variant="h6" gutterBottom>
              {title}
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </>
        )}
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            {emptyMessage || getEmptyMessage(type)}
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ p: 2 }}>
      {title && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {title}
            </Typography>
            {totalCount > 0 && (
              <Chip label={`${totalCount} ${type}`} size="small" />
            )}
          </Box>
          <Divider sx={{ mb: 2 }} />
        </>
      )}
      
      <List sx={{ width: '100%' }}>
        {users.map((user, index) => (
          <React.Fragment key={user.id}>
            <ListItem
              alignItems="flex-start"
              sx={{
                px: 0,
                cursor: onUserClick ? 'pointer' : 'default',
                '&:hover': onUserClick ? {
                  backgroundColor: 'action.hover',
                  borderRadius: 1,
                } : {},
              }}
              onClick={() => onUserClick?.(user)}
            >
              <ListItemAvatar>
                <Avatar
                  src={user.avatar}
                  alt={user.name}
                  sx={{ width: 48, height: 48 }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="subtitle1" component="span" fontWeight={500}>
                      {user.name}
                    </Typography>
                    {user.isVerified && (
                      <VerifiedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    )}
                  </Box>
                }
                secondary={
                  <>
                    {user.username && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        @{user.username}
                      </Typography>
                    )}
                    {user.bio && (
                      <Typography
                        component="p"
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5 }}
                      >
                        {user.bio}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>{user.followersCount}</strong> followers
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <strong>{user.followingCount}</strong> following
                      </Typography>
                    </Box>
                  </>
                }
              />
              
              {showFollowButton && session?.user?.id !== user.id && (
                <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                  <FollowButton
                    userId={user.id}
                    userName={user.name}
                    size="small"
                    variant="outlined"
                    onFollowChange={(isFollowing) => handleFollowChange(user.id, isFollowing)}
                  />
                  <IconButton size="small" sx={{ ml: 1 }}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
              )}
            </ListItem>
            
            {index < users.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </React.Fragment>
        ))}
      </List>
      
      {hasMore && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Button
            onClick={handleLoadMore}
            disabled={loading}
            variant="outlined"
          >
            {loading ? 'Loading...' : 'Load More'}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

// Helper function to get empty message based on type
const getEmptyMessage = (type: 'followers' | 'following' | 'suggestions'): string => {
  switch (type) {
    case 'followers':
      return 'No followers yet';
    case 'following':
      return 'Not following anyone yet';
    case 'suggestions':
      return 'No suggestions available';
    default:
      return 'No users found';
  }
};

export default FollowList;
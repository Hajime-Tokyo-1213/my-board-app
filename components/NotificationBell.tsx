'use client';

import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  Chip,
  Fade,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  FavoriteBorder,
  PersonAdd,
  Comment,
  Circle,
  CheckCircle,
  Refresh,
} from '@mui/icons-material';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';

const NotificationBell: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, fetchNotifications, sseConnected } = useNotifications();

  useEffect(() => {
    if (unreadCount > 0) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [unreadCount]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAllRead = async () => {
    await markAsRead();
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead([notificationId]);
  };

  const handleRefresh = async () => {
    await fetchNotifications();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <PersonAdd color="primary" />;
      case 'like':
        return <FavoriteBorder color="error" />;
      case 'comment':
        return <Comment color="action" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationLink = (notification: any) => {
    if (notification.postId) {
      return `/posts/${notification.postId._id}`;
    }
    if (notification.type === 'follow') {
      return `/users/${notification.fromUserId._id}`;
    }
    return '#';
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={sseConnected ? 'リアルタイム通知が有効' : '通知を取得中'}>
        <IconButton
          color="inherit"
          onClick={handleClick}
          aria-label={`${unreadCount} 件の未読通知`}
          sx={{
            animation: isAnimating ? 'pulse 1s ease-in-out' : 'none',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.1)' },
              '100%': { transform: 'scale(1)' },
            },
          }}
        >
          <Badge 
            badgeContent={unreadCount} 
            color="error"
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                animation: isAnimating ? 'bounce 0.5s ease' : 'none',
                '@keyframes bounce': {
                  '0%, 100%': { transform: 'translateY(0)' },
                  '50%': { transform: 'translateY(-3px)' },
                },
              },
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 350 }}
        PaperProps={{
          elevation: 8,
          sx: { 
            width: 420, 
            maxHeight: 600,
            borderRadius: 2,
            overflow: 'hidden',
          }
        }}
      >
        <Paper elevation={0} sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              通知
            </Typography>
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount}件の未読`}
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontWeight: 'bold',
                }}
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="small" 
              onClick={handleRefresh}
              sx={{ color: 'white' }}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
            {unreadCount > 0 && (
              <Button 
                size="small" 
                onClick={handleMarkAllRead}
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  }
                }}
                variant="outlined"
              >
                すべて既読
              </Button>
            )}
          </Box>
        </Paper>
        
        <Divider />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary" variant="body1">
              通知はありません
            </Typography>
          </Box>
        ) : (
          <List sx={{ 
            width: '100%', 
            maxHeight: 450, 
            overflow: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#888',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#555',
            },
          }}>
            {notifications.map((notification, index) => (
              <Fade in={true} timeout={300 + index * 50} key={notification._id}>
                <ListItem
                  component={Link}
                  href={getNotificationLink(notification)}
                  onClick={() => handleNotificationClick(notification._id)}
                  sx={{
                    position: 'relative',
                    backgroundColor: notification.read ? 'transparent' : 'rgba(102, 126, 234, 0.05)',
                    borderLeft: notification.read ? 'none' : '4px solid #667eea',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      transform: 'translateX(4px)',
                    },
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  <ListItemAvatar>
                    <Badge
                      overlap="circular"
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      badgeContent={
                        !notification.read && (
                          <Circle sx={{ fontSize: 12, color: '#667eea' }} />
                        )
                      }
                    >
                      <Avatar 
                        src={notification.fromUserId.profileImage}
                        sx={{ 
                          width: 44, 
                          height: 44,
                          border: '2px solid',
                          borderColor: notification.read ? 'transparent' : '#667eea',
                        }}
                      >
                        {getNotificationIcon(notification.type)}
                      </Avatar>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography 
                          variant="body2" 
                          component="span"
                          sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}
                        >
                          <strong>{notification.fromUserId.username}</strong>
                          {' '}
                          {notification.message}
                        </Typography>
                        {!notification.read && (
                          <Chip 
                            label="NEW" 
                            size="small" 
                            color="primary"
                            sx={{ 
                              height: 20,
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                      >
                        {notification.read && <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />}
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: ja,
                        })}
                      </Typography>
                    }
                  />
                </ListItem>
              </Fade>
            ))}
          </List>
        )}
      </Popover>
    </>
  );
};

export default NotificationBell;
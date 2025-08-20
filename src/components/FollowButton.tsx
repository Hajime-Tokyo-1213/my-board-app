'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  IconButton,
  CircularProgress,
  Tooltip,
  Box,
  Snackbar,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

interface FollowButtonProps {
  userId: string;
  userName?: string;
  variant?: 'contained' | 'outlined' | 'text' | 'icon';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  showFollowerCount?: boolean;
  followerCount?: number;
  onFollowChange?: (isFollowing: boolean, newCount?: number) => void;
  disabled?: boolean;
  className?: string;
  sx?: object;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  userName = 'this user',
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  showFollowerCount = false,
  followerCount = 0,
  onFollowChange,
  disabled = false,
  className,
  sx,
}) => {
  const theme = useTheme();
  const { data: session, status } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [localFollowerCount, setLocalFollowerCount] = useState(followerCount);
  
  // Notification states
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!session?.user?.id || !userId || session.user.id === userId) {
        return;
      }

      setChecking(true);
      try {
        const response = await fetch(`/api/follow/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.isFollowing || false);
          if (data.followersCount !== undefined) {
            setLocalFollowerCount(data.followersCount);
          }
        }
      } catch (error) {
        console.error('Error checking follow status:', error);
      } finally {
        setChecking(false);
      }
    };

    if (status === 'authenticated') {
      checkFollowStatus();
    }
  }, [session, userId, status]);

  // Update local follower count when prop changes
  useEffect(() => {
    setLocalFollowerCount(followerCount);
  }, [followerCount]);

  const handleFollowToggle = useCallback(async () => {
    if (!session) {
      setNotification({
        open: true,
        message: 'Please log in to follow users',
        severity: 'info',
      });
      return;
    }

    if (session.user?.id === userId) {
      setNotification({
        open: true,
        message: 'You cannot follow yourself',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    const method = isFollowing ? 'DELETE' : 'POST';

    try {
      const response = await fetch(`/api/follow/${userId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
      }

      const newFollowingState = !isFollowing;
      setIsFollowing(newFollowingState);
      
      // Update follower count
      const newCount = localFollowerCount + (newFollowingState ? 1 : -1);
      setLocalFollowerCount(newCount);

      // Show success notification
      setNotification({
        open: true,
        message: newFollowingState 
          ? `You are now following ${userName}`
          : `You unfollowed ${userName}`,
        severity: 'success',
      });

      // Call callback if provided
      if (onFollowChange) {
        onFollowChange(newFollowingState, newCount);
      }
    } catch (error: any) {
      setNotification({
        open: true,
        message: error.message || 'Something went wrong',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [session, userId, isFollowing, userName, localFollowerCount, onFollowChange]);

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // Don't show button for own profile
  if (session?.user?.id === userId) {
    return null;
  }

  // Loading state while checking
  if (checking) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', ...sx }} className={className}>
        <CircularProgress size={size === 'small' ? 20 : size === 'large' ? 28 : 24} />
      </Box>
    );
  }

  // Icon button variant
  if (variant === 'icon') {
    return (
      <>
        <Tooltip title={
          !session ? 'Log in to follow' :
          loading ? 'Processing...' :
          isFollowing ? 'Unfollow' : 'Follow'
        }>
          <span>
            <IconButton
              onClick={handleFollowToggle}
              disabled={!session || loading || disabled}
              size={size}
              className={className}
              sx={{
                color: isFollowing ? theme.palette.primary.main : theme.palette.text.secondary,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
                ...sx,
              }}
            >
              {loading ? (
                <CircularProgress size={size === 'small' ? 16 : size === 'large' ? 24 : 20} />
              ) : isFollowing ? (
                <CheckIcon />
              ) : (
                <PersonAddIcon />
              )}
            </IconButton>
          </span>
        </Tooltip>
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseNotification} severity={notification.severity}>
            {notification.message}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Button content
  const buttonContent = () => {
    if (loading) {
      return <CircularProgress size={20} color="inherit" />;
    }

    const icon = isFollowing ? (
      isHovered ? <PersonRemoveIcon /> : <CheckIcon />
    ) : (
      <PersonAddIcon />
    );

    const text = !session ? 'Log in to Follow' :
      isFollowing ? (isHovered ? 'Unfollow' : 'Following') : 'Follow';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={isFollowing ? 'following' : 'follow'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            {icon}
          </motion.div>
        </AnimatePresence>
        <span>{text}</span>
        {showFollowerCount && localFollowerCount !== undefined && (
          <Box
            component="span"
            sx={{
              ml: 1,
              px: 1,
              py: 0.5,
              borderRadius: '12px',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {localFollowerCount}
          </Box>
        )}
      </Box>
    );
  };

  // Determine button variant and color
  const getButtonProps = () => {
    if (!session) {
      return {
        variant: 'outlined' as const,
        color: 'inherit' as const,
      };
    }

    if (isFollowing) {
      return {
        variant: isHovered ? 'outlined' as const : 'contained' as const,
        color: isHovered ? 'error' as const : 'primary' as const,
      };
    }

    return {
      variant: variant === 'text' ? 'text' as const : 
               variant === 'outlined' ? 'outlined' as const : 
               'contained' as const,
      color: 'primary' as const,
    };
  };

  return (
    <>
      <Button
        {...getButtonProps()}
        onClick={handleFollowToggle}
        disabled={!session || loading || disabled}
        size={size}
        fullWidth={fullWidth}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={className}
        sx={{
          minWidth: fullWidth ? 'auto' : 120,
          textTransform: 'none',
          fontWeight: 500,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: theme.shadows[4],
          },
          ...sx,
        }}
      >
        {buttonContent()}
      </Button>

      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
            },
          }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default FollowButton;
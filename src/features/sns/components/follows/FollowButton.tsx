'use client';

import React, { useState, useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';

interface FollowButtonProps {
  userId: string;
  userName?: string;
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  iconOnly?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  showUnfollowConfirm?: boolean;
  className?: string;
}

export default function FollowButton({
  userId,
  userName = 'this user',
  variant = 'contained',
  size = 'medium',
  fullWidth = false,
  iconOnly = false,
  onFollowChange,
  showUnfollowConfirm = false,
  className,
}: FollowButtonProps) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check initial follow status
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!session?.user?.id || !userId) {
        setChecking(false);
        return;
      }

      if (session.user.id === userId) {
        setChecking(false);
        return;
      }

      try {
        const res = await fetch(`/api/sns/follow/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setIsFollowing(data.isFollowing || false);
        }
      } catch (err) {
        console.error('Failed to check follow status:', err);
      } finally {
        setChecking(false);
      }
    };

    checkFollowStatus();
  }, [session, userId]);

  const handleFollow = async () => {
    if (!session) {
      setError('Please log in to follow users');
      return;
    }

    if (loading) return;

    // Confirm unfollow if enabled
    if (isFollowing && showUnfollowConfirm) {
      const confirmed = window.confirm(`Unfollow ${userName}?`);
      if (!confirmed) return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `/api/sns/follow/${userId}`;
      const method = isFollowing ? 'DELETE' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update follow status');
      }

      setIsFollowing(!isFollowing);
      setSuccess(
        isFollowing
          ? `Unfollowed ${userName}`
          : `Following ${userName}`
      );

      if (onFollowChange) {
        onFollowChange(!isFollowing);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't show button for own profile
  if (session?.user?.id === userId) {
    return null;
  }

  // Not logged in
  if (!session) {
    if (iconOnly) {
      return (
        <Tooltip title="Log in to follow">
          <span>
            <IconButton disabled size={size}>
              <PersonAddIcon />
            </IconButton>
          </span>
        </Tooltip>
      );
    }
    return (
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled
        className={className}
      >
        Log in to Follow
      </Button>
    );
  }

  // Still checking initial status
  if (checking) {
    if (iconOnly) {
      return (
        <IconButton disabled size={size}>
          <CircularProgress size={20} />
        </IconButton>
      );
    }
    return (
      <Button
        variant={variant}
        size={size}
        fullWidth={fullWidth}
        disabled
        className={className}
      >
        <CircularProgress size={20} />
      </Button>
    );
  }

  // Icon only version
  if (iconOnly) {
    return (
      <>
        <Tooltip title={isFollowing ? 'Unfollow' : 'Follow'}>
          <IconButton
            onClick={handleFollow}
            disabled={loading}
            color={isFollowing ? 'default' : 'primary'}
            size={size}
            className={className}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : isFollowing ? (
              <PersonRemoveIcon />
            ) : (
              <PersonAddIcon />
            )}
          </IconButton>
        </Tooltip>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!success}
          autoHideDuration={3000}
          onClose={() => setSuccess(null)}
        >
          <Alert severity="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        </Snackbar>
      </>
    );
  }

  // Regular button version
  const getButtonText = () => {
    if (loading) return <CircularProgress size={20} color="inherit" />;
    if (isFollowing) {
      return isHovered ? 'Unfollow' : 'Following';
    }
    return 'Follow';
  };

  const getButtonProps = () => {
    if (isFollowing) {
      return {
        variant: isHovered ? 'outlined' as const : 'contained' as const,
        color: isHovered ? 'error' as const : 'default' as const,
        startIcon: isHovered ? <PersonRemoveIcon /> : <CheckIcon />,
      };
    }
    return {
      variant: variant,
      color: 'primary' as const,
      startIcon: <PersonAddIcon />,
    };
  };

  return (
    <>
      <Button
        {...getButtonProps()}
        size={size}
        fullWidth={fullWidth}
        onClick={handleFollow}
        disabled={loading}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={className}
        sx={{
          minWidth: iconOnly ? 'auto' : '100px',
          transition: 'all 0.2s',
        }}
      >
        {getButtonText()}
      </Button>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
    </>
  );
}
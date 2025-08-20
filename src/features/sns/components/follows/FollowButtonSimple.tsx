'use client';

import React from 'react';
import { Button, CircularProgress } from '@mui/material';
import { PersonAdd, Check } from '@mui/icons-material';
import { useFollowButton } from '../../hooks/useFollowButton';

interface FollowButtonSimpleProps {
  userId: string;
  userName?: string;
}

export function FollowButtonSimple({ userId, userName = 'user' }: FollowButtonSimpleProps) {
  const {
    isFollowing,
    isLoading,
    isChecking,
    toggleFollow,
  } = useFollowButton({
    userId,
    onFollowChange: (following) => {
      console.log(`Follow status changed: ${following}`);
    },
  });

  if (isChecking) {
    return (
      <Button disabled variant="contained">
        <CircularProgress size={20} />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outlined' : 'contained'}
      color={isFollowing ? 'default' : 'primary'}
      onClick={toggleFollow}
      disabled={isLoading}
      startIcon={
        isLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : isFollowing ? (
          <Check />
        ) : (
          <PersonAdd />
        )
      }
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
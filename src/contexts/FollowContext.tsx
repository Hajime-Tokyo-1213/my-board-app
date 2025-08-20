'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FollowState {
  [userId: string]: {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  };
}

interface FollowContextType {
  followStates: FollowState;
  updateFollowState: (userId: string, isFollowing: boolean, counts?: {
    followersCount?: number;
    followingCount?: number;
  }) => void;
  getFollowState: (userId: string) => {
    isFollowing: boolean;
    followersCount: number;
    followingCount: number;
  } | null;
  bulkUpdateFollowStates: (states: FollowState) => void;
  clearFollowStates: () => void;
}

const FollowContext = createContext<FollowContextType | undefined>(undefined);

export const useFollowContext = () => {
  const context = useContext(FollowContext);
  if (!context) {
    throw new Error('useFollowContext must be used within a FollowProvider');
  }
  return context;
};

interface FollowProviderProps {
  children: ReactNode;
}

export const FollowProvider: React.FC<FollowProviderProps> = ({ children }) => {
  const [followStates, setFollowStates] = useState<FollowState>({});

  const updateFollowState = useCallback((
    userId: string,
    isFollowing: boolean,
    counts?: {
      followersCount?: number;
      followingCount?: number;
    }
  ) => {
    setFollowStates(prev => ({
      ...prev,
      [userId]: {
        isFollowing,
        followersCount: counts?.followersCount ?? prev[userId]?.followersCount ?? 0,
        followingCount: counts?.followingCount ?? prev[userId]?.followingCount ?? 0,
      },
    }));
  }, []);

  const getFollowState = useCallback((userId: string) => {
    return followStates[userId] || null;
  }, [followStates]);

  const bulkUpdateFollowStates = useCallback((states: FollowState) => {
    setFollowStates(prev => ({
      ...prev,
      ...states,
    }));
  }, []);

  const clearFollowStates = useCallback(() => {
    setFollowStates({});
  }, []);

  const value: FollowContextType = {
    followStates,
    updateFollowState,
    getFollowState,
    bulkUpdateFollowStates,
    clearFollowStates,
  };

  return (
    <FollowContext.Provider value={value}>
      {children}
    </FollowContext.Provider>
  );
};

// Hook for managing follow state with API integration
export const useFollowState = (userId: string) => {
  const context = useContext(FollowContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followState = context?.getFollowState(userId);

  const checkFollowStatus = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/sns/follow/${userId}`);
      if (response.ok) {
        const data = await response.json();
        context?.updateFollowState(userId, data.isFollowing || false, {
          followersCount: data.followersCount,
          followingCount: data.followingCount,
        });
      } else {
        throw new Error('Failed to fetch follow status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, context]);

  const toggleFollow = useCallback(async () => {
    if (!userId || !context) return;
    
    setLoading(true);
    setError(null);
    
    const currentState = context.getFollowState(userId);
    const isCurrentlyFollowing = currentState?.isFollowing || false;
    const method = isCurrentlyFollowing ? 'DELETE' : 'POST';
    
    try {
      const response = await fetch(`/api/sns/follow/${userId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update follow status');
      }

      // Update local state
      const newFollowingState = !isCurrentlyFollowing;
      const newFollowersCount = (currentState?.followersCount || 0) + (newFollowingState ? 1 : -1);
      
      context.updateFollowState(userId, newFollowingState, {
        followersCount: newFollowersCount,
      });
      
      return newFollowingState;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, context]);

  return {
    isFollowing: followState?.isFollowing || false,
    followersCount: followState?.followersCount || 0,
    followingCount: followState?.followingCount || 0,
    loading,
    error,
    checkFollowStatus,
    toggleFollow,
  };
};
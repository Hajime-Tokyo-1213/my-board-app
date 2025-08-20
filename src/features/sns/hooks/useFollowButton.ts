import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface UseFollowButtonProps {
  userId: string;
  initialFollowStatus?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

interface UseFollowButtonReturn {
  isFollowing: boolean;
  isLoading: boolean;
  isChecking: boolean;
  error: string | null;
  toggleFollow: () => Promise<void>;
  checkFollowStatus: () => Promise<void>;
  clearError: () => void;
}

export function useFollowButton({
  userId,
  initialFollowStatus = false,
  onFollowChange,
}: UseFollowButtonProps): UseFollowButtonReturn {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialFollowStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check follow status
  const checkFollowStatus = useCallback(async () => {
    if (!session?.user?.id || !userId) {
      setIsChecking(false);
      return;
    }

    if (session.user.id === userId) {
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const res = await fetch(`/api/sns/follow/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing || false);
      } else {
        throw new Error('Failed to check follow status');
      }
    } catch (err: any) {
      console.error('Failed to check follow status:', err);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  }, [session, userId]);

  // Toggle follow/unfollow
  const toggleFollow = useCallback(async () => {
    if (!session) {
      setError('Please log in to follow users');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
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

      const newFollowStatus = !isFollowing;
      setIsFollowing(newFollowStatus);

      if (onFollowChange) {
        onFollowChange(newFollowStatus);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Follow action failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session, userId, isFollowing, isLoading, onFollowChange]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkFollowStatus();
  }, [checkFollowStatus]);

  return {
    isFollowing,
    isLoading,
    isChecking,
    error,
    toggleFollow,
    checkFollowStatus,
    clearError,
  };
}

// Hook for managing multiple follow buttons
export function useFollowButtons() {
  const [followStates, setFollowStates] = useState<Record<string, boolean>>({});

  const updateFollowState = useCallback((userId: string, isFollowing: boolean) => {
    setFollowStates(prev => ({
      ...prev,
      [userId]: isFollowing,
    }));
  }, []);

  const getFollowState = useCallback((userId: string): boolean => {
    return followStates[userId] || false;
  }, [followStates]);

  const clearFollowStates = useCallback(() => {
    setFollowStates({});
  }, []);

  return {
    followStates,
    updateFollowState,
    getFollowState,
    clearFollowStates,
  };
}
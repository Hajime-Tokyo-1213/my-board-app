import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { snsApi } from '../api';

export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => snsApi.users.follow(userId),
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

export const useUnfollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => snsApi.users.unfollow(userId),
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['follow-stats', userId] });
      queryClient.invalidateQueries({ queryKey: ['followers'] });
      queryClient.invalidateQueries({ queryKey: ['following'] });
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
};

export const useFollowStats = (userId: string) => {
  return useQuery({
    queryKey: ['follow-stats', userId],
    queryFn: async () => {
      const res = await fetch(`/api/sns/follow/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch follow stats');
      return res.json();
    },
    enabled: !!userId,
  });
};

export const useFollowers = (userId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['followers', userId, page, limit],
    queryFn: async () => {
      const res = await fetch(
        `/api/sns/followers/${userId}?page=${page}&limit=${limit}`
      );
      if (!res.ok) throw new Error('Failed to fetch followers');
      return res.json();
    },
    enabled: !!userId,
  });
};

export const useFollowing = (userId: string, page = 1, limit = 20) => {
  return useQuery({
    queryKey: ['following', userId, page, limit],
    queryFn: async () => {
      const res = await fetch(
        `/api/sns/following/${userId}?page=${page}&limit=${limit}`
      );
      if (!res.ok) throw new Error('Failed to fetch following');
      return res.json();
    },
    enabled: !!userId,
  });
};
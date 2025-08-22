'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { IPrivacySettings, defaultPrivacySettings } from '@/models/PrivacySettings';

interface UsePrivacyReturn {
  settings: IPrivacySettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<IPrivacySettings>) => Promise<void>;
  resetSettings: () => Promise<IPrivacySettings>;
  checkBlocked: (userId: string) => Promise<boolean>;
  blockUser: (userId: string, reason?: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  getBlockedUsers: () => Promise<any[]>;
  canViewPost: (post: any) => boolean;
  canInteract: (userId: string, type: 'comment' | 'like' | 'share') => boolean;
}

export function usePrivacy(): UsePrivacyReturn {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<IPrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  // プライバシー設定を取得
  const fetchSettings = useCallback(async () => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/privacy');
      
      if (!response.ok) {
        throw new Error('プライバシー設定の取得に失敗しました');
      }

      const data = await response.json();
      setSettings(data.settings || defaultPrivacySettings);
    } catch (err) {
      console.error('Error fetching privacy settings:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setSettings(defaultPrivacySettings);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // ブロックリストを取得
  const fetchBlockedUsers = useCallback(async () => {
    if (!session?.user) return;

    try {
      const response = await fetch('/api/blocks');
      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.users.map((u: any) => u.id));
      }
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    }
  }, [session]);

  useEffect(() => {
    fetchSettings();
    fetchBlockedUsers();
  }, [fetchSettings, fetchBlockedUsers]);

  // プライバシー設定を更新
  const updateSettings = async (newSettings: Partial<IPrivacySettings>) => {
    try {
      const response = await fetch('/api/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'プライバシー設定の更新に失敗しました');
      }

      const data = await response.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Error updating privacy settings:', err);
      throw err;
    }
  };

  // プライバシー設定をリセット
  const resetSettings = async (): Promise<IPrivacySettings> => {
    try {
      const response = await fetch('/api/privacy/reset', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('プライバシー設定のリセットに失敗しました');
      }

      const data = await response.json();
      setSettings(data.settings);
      return data.settings;
    } catch (err) {
      console.error('Error resetting privacy settings:', err);
      throw err;
    }
  };

  // ユーザーがブロックされているかチェック
  const checkBlocked = async (userId: string): Promise<boolean> => {
    return blockedUsers.includes(userId);
  };

  // ユーザーをブロック
  const blockUser = async (userId: string, reason?: string) => {
    try {
      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, reason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ブロックに失敗しました');
      }

      setBlockedUsers([...blockedUsers, userId]);
    } catch (err) {
      console.error('Error blocking user:', err);
      throw err;
    }
  };

  // ブロック解除
  const unblockUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/blocks?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'ブロック解除に失敗しました');
      }

      setBlockedUsers(blockedUsers.filter(id => id !== userId));
    } catch (err) {
      console.error('Error unblocking user:', err);
      throw err;
    }
  };

  // ブロックユーザーリストを取得
  const getBlockedUsers = async (): Promise<any[]> => {
    try {
      const response = await fetch('/api/blocks');
      if (!response.ok) {
        throw new Error('ブロックリストの取得に失敗しました');
      }

      const data = await response.json();
      return data.users;
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      return [];
    }
  };

  // 投稿の閲覧可否をチェック
  const canViewPost = (post: any): boolean => {
    if (!settings) return true;

    // 自分の投稿は常に見れる
    if (post.authorId === session?.user?.id) return true;

    // ブロックされているユーザーの投稿は見れない
    if (blockedUsers.includes(post.authorId)) return false;

    // 投稿の公開範囲に基づく判定
    switch (post.visibility) {
      case 'public':
        return true;
      case 'followers':
        // フォロワーチェックが必要（実装はバックエンドで）
        return post.canView || false;
      case 'mutual':
        // 相互フォローチェックが必要
        return post.canView || false;
      case 'private':
        return false;
      default:
        return true;
    }
  };

  // インタラクションの可否をチェック
  const canInteract = (
    userId: string,
    type: 'comment' | 'like' | 'share'
  ): boolean => {
    if (!settings) return true;

    // ブロックされているユーザーとはインタラクション不可
    if (blockedUsers.includes(userId)) return false;

    // 設定に基づく判定
    switch (type) {
      case 'comment':
        return settings.allowComments !== 'none';
      case 'like':
        return settings.allowLikes !== 'none';
      case 'share':
        return settings.allowShares !== 'none';
      default:
        return true;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    resetSettings,
    checkBlocked,
    blockUser,
    unblockUser,
    getBlockedUsers,
    canViewPost,
    canInteract,
  };
}

// ブロック管理用のカスタムフック
export function useBlockedUsers() {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockedUsers = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blocks?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('ブロックリストの取得に失敗しました');
      }

      const data = await response.json();
      setBlockedUsers(data.users);
      return data;
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return { users: [], total: 0, page: 1, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/blocks?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('ブロック解除に失敗しました');
      }

      // リストから削除
      setBlockedUsers(blockedUsers.filter(user => user.id !== userId));
      return true;
    } catch (err) {
      console.error('Error unblocking user:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return false;
    }
  };

  return {
    blockedUsers,
    loading,
    error,
    fetchBlockedUsers,
    unblockUser,
  };
}

// フォローリクエスト管理用のカスタムフック
export function useFollowRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async (page: number = 1, limit: number = 20) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/follow-requests?page=${page}&limit=${limit}`);
      
      if (!response.ok) {
        throw new Error('フォローリクエストの取得に失敗しました');
      }

      const data = await response.json();
      setRequests(data.requests);
      return data;
    } catch (err) {
      console.error('Error fetching follow requests:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return { requests: [], total: 0, page: 1, totalPages: 0 };
    } finally {
      setLoading(false);
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/follow-requests/${requestId}/approve`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('承認に失敗しました');
      }

      // リストから削除
      setRequests(requests.filter(req => req.id !== requestId));
      return true;
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return false;
    }
  };

  const rejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/follow-requests/${requestId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('拒否に失敗しました');
      }

      // リストから削除
      setRequests(requests.filter(req => req.id !== requestId));
      return true;
    } catch (err) {
      console.error('Error rejecting request:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return false;
    }
  };

  const bulkApprove = async (requestIds: string[]) => {
    try {
      const response = await fetch('/api/follow-requests/bulk-approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requestIds }),
      });

      if (!response.ok) {
        throw new Error('一括承認に失敗しました');
      }

      // リストから削除
      setRequests(requests.filter(req => !requestIds.includes(req.id)));
      return true;
    } catch (err) {
      console.error('Error bulk approving:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      return false;
    }
  };

  return {
    requests,
    loading,
    error,
    fetchRequests,
    approveRequest,
    rejectRequest,
    bulkApprove,
  };
}
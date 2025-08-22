import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePrivacy, useBlockedUsers, useFollowRequests } from '@/hooks/usePrivacy';
import { defaultPrivacySettings } from '@/models/PrivacySettings';

jest.mock('next-auth/react');

// Mock fetch globally
global.fetch = jest.fn();

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('usePrivacy', () => {
  const mockSession = {
    user: {
      email: 'user@example.com',
      name: 'Test User',
      id: 'user123',
    },
  };

  beforeEach(() => {
    (useSession as jest.Mock).mockReturnValue({ data: mockSession });
  });

  describe('Initial Load', () => {
    it('should load privacy settings on mount', async () => {
      const mockSettings = {
        ...defaultPrivacySettings,
        isPrivate: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: mockSettings }),
      } as Response);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      } as Response);

      const { result } = renderHook(() => usePrivacy());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings).toEqual(mockSettings);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings).toEqual(defaultPrivacySettings);
      expect(result.current.error).toBe('Network error');
    });

    it('should not load when no session', async () => {
      (useSession as jest.Mock).mockReturnValue({ data: null });

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.settings).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('updateSettings', () => {
    it('should update privacy settings', async () => {
      const initialSettings = defaultPrivacySettings;
      const updatedSettings = {
        ...defaultPrivacySettings,
        isPrivate: true,
        requireFollowApproval: true,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: initialSettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: updatedSettings }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.updateSettings({
          isPrivate: true,
          requireFollowApproval: true,
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/privacy', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: {
            isPrivate: true,
            requireFollowApproval: true,
          },
        }),
      });

      expect(result.current.settings).toEqual(updatedSettings);
    });

    it('should handle update errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Update failed' }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.updateSettings({ isPrivate: true });
        })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Block Management', () => {
    it('should block a user', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'User blocked' }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.blockUser('user456', 'Spam');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'user456',
          reason: 'Spam',
        }),
      });
    });

    it('should unblock a user', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ id: 'user456' }] }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'User unblocked' }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.unblockUser('user456');
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/blocks?userId=user456', {
        method: 'DELETE',
      });
    });

    it('should check if user is blocked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ id: 'user456' }] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const isBlocked = await result.current.checkBlocked('user456');
      expect(isBlocked).toBe(true);

      const isNotBlocked = await result.current.checkBlocked('user789');
      expect(isNotBlocked).toBe(false);
    });
  });

  describe('canViewPost', () => {
    it('should allow viewing own posts', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const post = {
        authorId: 'user123',
        visibility: 'private',
      };

      expect(result.current.canViewPost(post)).toBe(true);
    });

    it('should block posts from blocked users', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ id: 'blocked123' }] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const post = {
        authorId: 'blocked123',
        visibility: 'public',
      };

      expect(result.current.canViewPost(post)).toBe(false);
    });

    it('should respect post visibility settings', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const publicPost = {
        authorId: 'other123',
        visibility: 'public',
      };
      expect(result.current.canViewPost(publicPost)).toBe(true);

      const privatePost = {
        authorId: 'other123',
        visibility: 'private',
      };
      expect(result.current.canViewPost(privatePost)).toBe(false);

      const followersPost = {
        authorId: 'other123',
        visibility: 'followers',
        canView: true,
      };
      expect(result.current.canViewPost(followersPost)).toBe(true);
    });
  });

  describe('canInteract', () => {
    it('should allow interactions based on settings', async () => {
      const settings = {
        ...defaultPrivacySettings,
        allowComments: 'followers',
        allowLikes: 'everyone',
        allowShares: 'none',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canInteract('user456', 'comment')).toBe(true);
      expect(result.current.canInteract('user456', 'like')).toBe(true);
      expect(result.current.canInteract('user456', 'share')).toBe(false);
    });

    it('should block interactions from blocked users', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ settings: defaultPrivacySettings }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [{ id: 'blocked123' }] }),
        } as Response);

      const { result } = renderHook(() => usePrivacy());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.canInteract('blocked123', 'comment')).toBe(false);
      expect(result.current.canInteract('blocked123', 'like')).toBe(false);
      expect(result.current.canInteract('blocked123', 'share')).toBe(false);
    });
  });
});

describe('useBlockedUsers', () => {
  it('should fetch blocked users', async () => {
    const blockedUsers = [
      { id: 'user1', name: 'User 1', blockedAt: new Date() },
      { id: 'user2', name: 'User 2', blockedAt: new Date() },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        users: blockedUsers,
        total: 2,
        page: 1,
        totalPages: 1,
      }),
    } as Response);

    const { result } = renderHook(() => useBlockedUsers());

    await act(async () => {
      await result.current.fetchBlockedUsers(1, 10);
    });

    expect(result.current.blockedUsers).toEqual(blockedUsers);
    expect(result.current.error).toBeNull();
  });

  it('should unblock a user', async () => {
    const blockedUsers = [
      { id: 'user1', name: 'User 1' },
      { id: 'user2', name: 'User 2' },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: blockedUsers }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Unblocked' }),
      } as Response);

    const { result } = renderHook(() => useBlockedUsers());

    await act(async () => {
      await result.current.fetchBlockedUsers();
    });

    await act(async () => {
      const success = await result.current.unblockUser('user1');
      expect(success).toBe(true);
    });

    expect(result.current.blockedUsers).toEqual([{ id: 'user2', name: 'User 2' }]);
  });
});

describe('useFollowRequests', () => {
  it('should fetch follow requests', async () => {
    const requests = [
      { id: 'req1', requester: { name: 'User 1' }, createdAt: new Date() },
      { id: 'req2', requester: { name: 'User 2' }, createdAt: new Date() },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        requests,
        total: 2,
        page: 1,
        totalPages: 1,
      }),
    } as Response);

    const { result } = renderHook(() => useFollowRequests());

    await act(async () => {
      await result.current.fetchRequests(1, 10);
    });

    expect(result.current.requests).toEqual(requests);
    expect(result.current.error).toBeNull();
  });

  it('should approve a request', async () => {
    const requests = [
      { id: 'req1', requester: { name: 'User 1' } },
      { id: 'req2', requester: { name: 'User 2' } },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Approved' }),
      } as Response);

    const { result } = renderHook(() => useFollowRequests());

    await act(async () => {
      await result.current.fetchRequests();
    });

    await act(async () => {
      const success = await result.current.approveRequest('req1');
      expect(success).toBe(true);
    });

    expect(result.current.requests).toEqual([{ id: 'req2', requester: { name: 'User 2' } }]);
  });

  it('should reject a request', async () => {
    const requests = [
      { id: 'req1', requester: { name: 'User 1' } },
      { id: 'req2', requester: { name: 'User 2' } },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Rejected' }),
      } as Response);

    const { result } = renderHook(() => useFollowRequests());

    await act(async () => {
      await result.current.fetchRequests();
    });

    await act(async () => {
      const success = await result.current.rejectRequest('req1');
      expect(success).toBe(true);
    });

    expect(result.current.requests).toEqual([{ id: 'req2', requester: { name: 'User 2' } }]);
  });

  it('should bulk approve requests', async () => {
    const requests = [
      { id: 'req1', requester: { name: 'User 1' } },
      { id: 'req2', requester: { name: 'User 2' } },
      { id: 'req3', requester: { name: 'User 3' } },
    ];

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ requests }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Bulk approved' }),
      } as Response);

    const { result } = renderHook(() => useFollowRequests());

    await act(async () => {
      await result.current.fetchRequests();
    });

    await act(async () => {
      const success = await result.current.bulkApprove(['req1', 'req2']);
      expect(success).toBe(true);
    });

    expect(result.current.requests).toEqual([{ id: 'req3', requester: { name: 'User 3' } }]);
  });
});
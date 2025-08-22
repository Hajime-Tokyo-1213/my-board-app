import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import UserSearch from '@/components/UserSearch';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Fetch APIのモック
global.fetch = jest.fn();

describe('UserSearch Component', () => {
  const mockSession = {
    user: { id: 'user1', email: 'user@example.com' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    } as any);

    const { useSession } = require('next-auth/react');
    useSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Search Input', () => {
    it('should render search input with placeholder', () => {
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input change', async () => {
      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, '田中');
      
      expect(searchInput).toHaveValue('田中');
    });

    it('should clear search on clear button click', async () => {
      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test');
      
      const clearButton = screen.getByRole('button', { name: '' });
      await user.click(clearButton);
      
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Search Suggestions', () => {
    it('should fetch and display suggestions on input', async () => {
      const mockSuggestions = {
        suggestions: [
          {
            type: 'user',
            value: '田中太郎',
            metadata: {
              userId: 'user2',
              username: 'tanaka',
              profileImage: 'image.jpg',
              followersCount: 100
            }
          },
          {
            type: 'query',
            value: '田中さん'
          },
          {
            type: 'history',
            value: '田中検索'
          }
        ]
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestions,
      });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, '田中');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/suggestions?q=田中')
        );
      });
    });

    it('should debounce suggestion requests', async () => {
      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      
      // 素早く複数文字を入力
      await user.type(searchInput, 'abc');

      // デバウンス時間待機
      await waitFor(() => {
        // 最後の入力に対してのみAPIが呼ばれることを確認
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/suggestions?q=abc')
        );
      }, { timeout: 500 });
    });
  });

  describe('Search Execution', () => {
    it('should perform search on form submit', async () => {
      const mockSearchResults = {
        users: [
          {
            _id: 'user2',
            name: '田中太郎',
            username: 'tanaka',
            displayName: 'たなか太郎',
            email: 'tanaka@example.com',
            bio: 'こんにちは',
            followersCount: 100,
            followingCount: 50,
            postsCount: 200,
            isFollowing: false,
            score: 85
          }
        ],
        totalCount: 1,
        suggestions: [],
        relatedTags: []
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResults,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, '田中{enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/search?q=田中')
        );
      });

      await waitFor(() => {
        expect(screen.getByText('たなか太郎')).toBeInTheDocument();
        expect(screen.getByText('@tanaka')).toBeInTheDocument();
        expect(screen.getByText('100')).toBeInTheDocument();
      });
    });

    it('should handle Japanese text search correctly', async () => {
      const testCases = [
        { input: 'たなか', expected: 'たなか' },
        { input: 'タナカ', expected: 'タナカ' },
        { input: '田中', expected: '田中' },
        { input: 'ﾀﾅｶ', expected: 'ﾀﾅｶ' },
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ users: [], totalCount: 0 }),
        });

        const user = userEvent.setup();
        const { unmount } = render(
          <SessionProvider session={mockSession}>
            <UserSearch />
          </SessionProvider>
        );

        const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
        await user.type(searchInput, `${testCase.input}{enter}`);

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining(`/api/users/search?q=${encodeURIComponent(testCase.expected)}`)
          );
        });

        unmount();
      }
    });
  });

  describe('Search Options', () => {
    it('should switch search types', async () => {
      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test');

      // 検索タイプボタンが表示される
      const nameButton = screen.getByRole('button', { name: '名前' });
      await user.click(nameButton);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalCount: 0 }),
      });

      await user.type(searchInput, '{enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=name')
        );
      });
    });

    it('should switch sort order', async () => {
      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test');

      const popularityButton = screen.getByRole('button', { name: '人気順' });
      await user.click(popularityButton);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalCount: 0 }),
      });

      await user.type(searchInput, '{enter}');

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=popularity')
        );
      });
    });
  });

  describe('Recommended Users', () => {
    it('should load recommended users on mount', async () => {
      const mockRecommended = {
        users: [
          {
            user: {
              _id: 'user2',
              name: 'おすすめユーザー',
              username: 'recommend',
              followersCount: 500,
              followingCount: 100,
              isFollowing: false
            },
            reason: '似ているユーザー',
            score: 90
          }
        ],
        totalCount: 1
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecommended,
      });

      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/recommended')
        );
      });
    });

    it('should fetch different types of recommended users', async () => {
      const mockRecommended = {
        users: [],
        totalCount: 0
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockRecommended,
      });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      // おすすめタブに切り替え
      const recommendTab = screen.getByRole('tab', { name: 'おすすめユーザー' });
      await user.click(recommendTab);

      // 各タイプのボタンをクリック
      const popularButton = screen.getByRole('button', { name: '人気ユーザー' });
      await user.click(popularButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=popular')
        );
      });

      const activeButton = screen.getByRole('button', { name: 'アクティブ' });
      await user.click(activeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=active')
        );
      });
    });
  });

  describe('Follow/Unfollow', () => {
    it('should handle follow action', async () => {
      const mockSearchResults = {
        users: [{
          _id: 'user2',
          name: 'テストユーザー',
          username: 'testuser',
          followersCount: 100,
          followingCount: 50,
          postsCount: 200,
          isFollowing: false
        }],
        totalCount: 1
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResults,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test{enter}');

      await waitFor(() => {
        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      });

      const followButton = screen.getByRole('button', { name: /フォロー/ });
      await user.click(followButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/follow/user2'),
          expect.objectContaining({ method: 'POST' })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle search API errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test{enter}');

      // エラーが発生してもアプリがクラッシュしないことを確認
      expect(searchInput).toBeInTheDocument();
    });

    it('should display no results message', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [], totalCount: 0 }),
      });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'nonexistent{enter}');

      await waitFor(() => {
        expect(screen.getByText('「nonexistent」に一致するユーザーが見つかりませんでした')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to user profile on click', async () => {
      const mockSearchResults = {
        users: [{
          _id: 'user2',
          name: 'テストユーザー',
          username: 'testuser',
          followersCount: 100,
          followingCount: 50,
          postsCount: 200,
          isFollowing: false
        }],
        totalCount: 1
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResults,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true }),
        });

      const user = userEvent.setup();
      render(
        <SessionProvider session={mockSession}>
          <UserSearch />
        </SessionProvider>
      );

      const searchInput = screen.getByPlaceholderText('ユーザーを検索（名前、ユーザー名、自己紹介）');
      await user.type(searchInput, 'test{enter}');

      await waitFor(() => {
        expect(screen.getByText('テストユーザー')).toBeInTheDocument();
      });

      const profileButton = screen.getByRole('button', { name: 'プロフィール' });
      await user.click(profileButton);

      expect(mockPush).toHaveBeenCalledWith('/users/user2');
    });
  });
});
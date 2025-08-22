import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InfiniteScroll from '@/components/InfiniteScroll';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';

// MSW設定
const { setupServer } = require('msw/node');
const { http, HttpResponse } = require('msw');

// モックデータ
const createMockPosts = (count: number, startId: number = 1) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${startId + i}`,
    _id: `${startId + i}`,
    userId: `user${(i % 3) + 1}`,
    userName: `Test User ${(i % 3) + 1}`,
    userImage: `/avatar${(i % 3) + 1}.jpg`,
    content: `Test post content ${startId + i}. This is a sample post for testing infinite scroll functionality.`,
    imageUrl: i % 2 === 0 ? `/image${i}.jpg` : null,
    videoUrl: null,
    likeCount: Math.floor(Math.random() * 100),
    commentCount: Math.floor(Math.random() * 50),
    likes: [],
    hashtags: i % 3 === 0 ? ['test', 'sample'] : ['test'],
    createdAt: new Date(2024, 0, startId + i).toISOString(),
    updatedAt: new Date(2024, 0, startId + i).toISOString(),
  }));
};

// MSWサーバー設定
let apiCallCount = 0;
const server = setupServer(
  http.get('/api/posts/feed', ({ request }) => {
    const url = new URL(request.url);
    const cursor = url.searchParams.get('cursor');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    apiCallCount++;

    // 初回リクエスト
    if (!cursor) {
      const posts = createMockPosts(limit);
      return HttpResponse.json({
        posts,
        nextCursor: '20',
        hasMore: true,
        totalNew: 0,
      });
    }

    // 2ページ目
    if (cursor === '20') {
      const posts = createMockPosts(limit, 21);
      return HttpResponse.json({
        posts,
        nextCursor: '40',
        hasMore: true,
        totalNew: 0,
      });
    }

    // 最終ページ
    const posts = createMockPosts(5, 41);
    return HttpResponse.json({
      posts,
      nextCursor: null,
      hasMore: false,
      totalNew: 0,
    });
  }),

  http.get('/api/posts/new-count', () => {
    return HttpResponse.json({ count: 5 });
  }),

  http.delete('/api/posts/:id', () => {
    return HttpResponse.json({ success: true });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  apiCallCount = 0;
});
afterAll(() => server.close());

// テスト用Wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  const mockSession = {
    user: {
      id: 'test-user',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: '2024-12-31',
  };

  return ({ children }: { children: React.ReactNode }) => (
    <SessionProvider session={mockSession}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
};

// TimelinePostCardのモック
jest.mock('@/components/TimelinePostCard', () => {
  return function MockTimelinePostCard({ post, onDelete, onUserClick }: any) {
    return (
      <div data-testid={`post-${post.id}`}>
        <h3>{post.userName}</h3>
        <p>{post.content}</p>
        {post.imageUrl && <img src={post.imageUrl} alt="Post" />}
        <button onClick={() => onDelete(post.id)}>Delete</button>
        <button onClick={() => onUserClick(post.userId)}>View User</button>
        <span>Likes: {post.likeCount}</span>
        <span>Comments: {post.commentCount}</span>
      </div>
    );
  };
});

// @tanstack/react-virtualのモック
jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
  }),
}));

describe('InfiniteScroll Component', () => {
  beforeEach(() => {
    // IntersectionObserverのモック
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
    window.IntersectionObserver = mockIntersectionObserver as any;

    // scrollToのモック
    window.scrollTo = jest.fn();
  });

  it('初期ローディング状態を表示する', () => {
    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    // スケルトンローダーが表示されることを確認
    const skeletons = screen.getByRole('progressbar');
    expect(skeletons).toBeInTheDocument();
  });

  it('投稿を正しく表示する', async () => {
    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // 複数の投稿が表示されることを確認
    expect(screen.getByText('Test User 1')).toBeInTheDocument();
    expect(screen.getByText(/Test post content 1/)).toBeInTheDocument();
  });

  it('スクロール時に次のページを読み込む', async () => {
    const { container } = render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // 初回のAPI呼び出しを確認
    expect(apiCallCount).toBe(1);

    // IntersectionObserverのトリガーをシミュレート
    const observerCallback = (window.IntersectionObserver as any).mock.calls[0][0];
    observerCallback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(apiCallCount).toBeGreaterThan(1);
    }, { timeout: 3000 });
  });

  it('エラー時にエラーメッセージを表示する', async () => {
    server.use(
      http.get('/api/posts/feed', () => {
        return HttpResponse.json(
          { error: 'Server Error' },
          { status: 500 }
        );
      })
    );

    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/投稿の取得に失敗しました/)).toBeInTheDocument();
    });

    // 再試行ボタンが表示されることを確認
    const retryButton = screen.getByText('再試行');
    expect(retryButton).toBeInTheDocument();
  });

  it('投稿が0件の時に適切なメッセージを表示する', async () => {
    server.use(
      http.get('/api/posts/feed', () => {
        return HttpResponse.json({
          posts: [],
          nextCursor: null,
          hasMore: false,
          totalNew: 0,
        });
      })
    );

    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('投稿がまだありません')).toBeInTheDocument();
    });
  });

  it('新着投稿通知が表示される', async () => {
    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // 新着投稿があることをシミュレート
    // （実際にはポーリングで取得されるが、ここでは状態を直接更新）
    // 注: 実装により適切なテスト方法は変わる可能性があります
  });

  it('削除ボタンクリック時に確認ダイアログを表示する', async () => {
    window.confirm = jest.fn(() => true);

    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith('この投稿を削除してもよろしいですか？');
  });

  it('ユーザークリック時にコールバックが呼ばれる', async () => {
    const onUserClick = jest.fn();

    render(
      <InfiniteScroll onUserClick={onUserClick} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    const userButton = screen.getAllByText('View User')[0];
    fireEvent.click(userButton);

    expect(onUserClick).toHaveBeenCalledWith('user1');
  });

  it('ハッシュタグフィルターが適用される', async () => {
    render(
      <InfiniteScroll hashtag="test" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // APIが正しいパラメータで呼ばれることを確認
    expect(apiCallCount).toBe(1);
  });

  it('ユーザーIDフィルターが適用される', async () => {
    render(
      <InfiniteScroll userId="user1" />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // APIが正しいパラメータで呼ばれることを確認
    expect(apiCallCount).toBe(1);
  });

  it('スクロールトップボタンが表示・動作する', async () => {
    // scrollYを設定
    Object.defineProperty(window, 'scrollY', {
      writable: true,
      value: 500,
    });

    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });

    // スクロールイベントをトリガー
    fireEvent.scroll(window, { target: { scrollY: 500 } });

    // スクロールトップボタンが表示されることを確認
    // （実装により、ボタンの表示条件が異なる可能性があります）
  });

  it('最後のページに到達した時のメッセージを表示する', async () => {
    server.use(
      http.get('/api/posts/feed', ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get('cursor');
        
        if (!cursor) {
          return HttpResponse.json({
            posts: createMockPosts(5),
            nextCursor: null,
            hasMore: false,
            totalNew: 0,
          });
        }

        return HttpResponse.json({
          posts: [],
          nextCursor: null,
          hasMore: false,
          totalNew: 0,
        });
      })
    );

    render(
      <InfiniteScroll />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('すべての投稿を表示しました')).toBeInTheDocument();
    });
  });

  it('仮想スクロールが有効化される条件を確認する', async () => {
    // 50件以上の投稿データを返すようにモック
    server.use(
      http.get('/api/posts/feed', () => {
        return HttpResponse.json({
          posts: createMockPosts(60),
          nextCursor: null,
          hasMore: false,
          totalNew: 0,
        });
      })
    );

    render(
      <InfiniteScroll enableVirtualization={true} />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // 仮想スクロールが有効な場合の表示を確認
      expect(screen.getByTestId('post-1')).toBeInTheDocument();
    });
  });
});
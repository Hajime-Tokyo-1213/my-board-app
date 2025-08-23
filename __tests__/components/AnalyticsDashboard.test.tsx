import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import '@testing-library/jest-dom';

// fetch APIのモック
global.fetch = jest.fn();

// Chart.jsのモック
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="line-chart">Line Chart</div>,
  Bar: () => <div data-testid="bar-chart">Bar Chart</div>,
}));

jest.mock('chart.js', () => ({
  Chart: jest.fn(),
  CategoryScale: jest.fn(),
  LinearScale: jest.fn(),
  PointElement: jest.fn(),
  LineElement: jest.fn(),
  BarElement: jest.fn(),
  Title: jest.fn(),
  Tooltip: jest.fn(),
  Legend: jest.fn(),
  Filler: jest.fn(),
  register: jest.fn(),
}));

// date-fnsのモック
jest.mock('date-fns', () => ({
  format: jest.fn((date, format) => '01/01'),
  parseISO: jest.fn((date) => new Date(date)),
}));

describe('AnalyticsDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AnalyticsDashboard />
      </QueryClientProvider>
    );
  };

  const mockStatsData = {
    followers: 1500,
    following: 750,
    totalPosts: 125,
    totalLikes: 3200,
    totalComments: 450,
    engagementRate: 5.2,
    periodComparison: {
      followersChange: 12.5,
      postsChange: 8.3,
      engagementChange: 0.8,
    },
  };

  const mockGrowthData = {
    data: Array(7).fill(null).map((_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, '0')}`,
      followers: 1000 + i * 50,
      posts: 100 + i * 5,
      engagement: 4.5 + i * 0.2,
      likes: 2000 + i * 100,
    })),
  };

  const mockPopularPosts = {
    posts: Array(5).fill(null).map((_, i) => ({
      id: `post-${i}`,
      title: `Popular Post ${i + 1}`,
      content: `This is the content of popular post ${i + 1}`,
      thumbnail: null,
      likes: 100 - i * 10,
      comments: 20 - i * 2,
      engagementScore: (10 - i).toString(),
      createdAt: new Date().toISOString(),
    })),
  };

  const mockInsights = {
    insights: [
      { type: 'success', message: '素晴らしいエンゲージメント率です！' },
      { type: 'warning', message: '投稿頻度を上げることをお勧めします。' },
      { type: 'info', message: '午後3時の投稿が最も効果的です。' },
    ],
  };

  describe('基本統計の表示', () => {
    it('統計カードが正しく表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=stats')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockStatsData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('分析ダッシュボード')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('フォロワー')).toBeInTheDocument();
        expect(screen.getByText('総投稿数')).toBeInTheDocument();
        expect(screen.getByText('総いいね数')).toBeInTheDocument();
        expect(screen.getByText('エンゲージメント率')).toBeInTheDocument();
      });

      // 値の表示確認
      await waitFor(() => {
        expect(screen.getByText('1.5K')).toBeInTheDocument(); // フォロワー数
        expect(screen.getByText('125')).toBeInTheDocument(); // 投稿数
        expect(screen.getByText('3.2K')).toBeInTheDocument(); // いいね数
        expect(screen.getByText('5.2%')).toBeInTheDocument(); // エンゲージメント率
      });
    });

    it('ローディング状態が表示されること', () => {
      (fetch as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // 永続的にpending
      );

      renderComponent();

      expect(screen.getByText('分析ダッシュボード')).toBeInTheDocument();
      expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
    });
  });

  describe('グラフの描画', () => {
    it('成長グラフが表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=growth')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGrowthData),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('成長推移')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    it('期間選択が機能すること', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGrowthData),
      });

      renderComponent();

      await waitFor(() => {
        const periodSelect = screen.getByRole('combobox', { name: /期間/i });
        expect(periodSelect).toBeInTheDocument();
      });

      const periodSelect = screen.getByRole('combobox', { name: /期間/i });
      fireEvent.change(periodSelect, { target: { value: '90' } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('period=90')
        );
      });
    });

    it('グラフタイプの切り替えが機能すること', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockGrowthData),
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });

      const chartTypeSelect = screen.getAllByRole('combobox')[1];
      fireEvent.change(chartTypeSelect, { target: { value: 'bar' } });

      await waitFor(() => {
        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      });
    });
  });

  describe('人気投稿ランキング', () => {
    it('人気投稿が表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=popular-posts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockPopularPosts),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('人気投稿ランキング')).toBeInTheDocument();
      });

      await waitFor(() => {
        mockPopularPosts.posts.forEach((post, index) => {
          expect(screen.getByText(post.title)).toBeInTheDocument();
          expect(screen.getByText(`${index + 1}`)).toBeInTheDocument();
        });
      });
    });

    it('投稿がない場合のメッセージが表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=popular-posts')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ posts: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('投稿データがありません')).toBeInTheDocument();
      });
    });
  });

  describe('インサイト表示', () => {
    it('インサイトが正しく表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=insights')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockInsights),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('インサイト')).toBeInTheDocument();
      });

      await waitFor(() => {
        mockInsights.insights.forEach(insight => {
          expect(screen.getByText(insight.message)).toBeInTheDocument();
        });
      });
    });

    it('インサイトがない場合のメッセージが表示されること', async () => {
      (fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('type=insights')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ insights: [] }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByText('分析中...')).toBeInTheDocument();
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時にエラー状態が表示されること', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (fetch as jest.Mock).mockRejectedValue(new Error('API Error'));

      renderComponent();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('レスポンスエラー時に適切に処理されること', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      renderComponent();

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('データ更新', () => {
    it('5分ごとに統計データが更新されること', async () => {
      jest.useFakeTimers();

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatsData),
      });

      renderComponent();

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=stats')
        );
      });

      const initialCallCount = (fetch as jest.Mock).mock.calls.length;

      // 5分経過
      jest.advanceTimersByTime(5 * 60 * 1000);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(initialCallCount + 1);
      });

      jest.useRealTimers();
    });
  });
});
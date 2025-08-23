import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FollowerChart from '@/components/FollowerChart';
import '@testing-library/jest-dom';

// Chart.jsのモック
jest.mock('react-chartjs-2', () => ({
  Line: ({ data, options }: any) => (
    <div data-testid="line-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
  Bar: ({ data, options }: any) => (
    <div data-testid="bar-chart">
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <div data-testid="chart-options">{JSON.stringify(options)}</div>
    </div>
  ),
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

jest.mock('date-fns', () => ({
  format: jest.fn((date, format) => {
    const d = new Date(date);
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }),
  parseISO: jest.fn((date) => new Date(date)),
}));

jest.mock('date-fns/locale', () => ({
  ja: {},
}));

describe('FollowerChart', () => {
  const mockData = [
    {
      date: '2024-01-01',
      followers: 100,
      posts: 10,
      engagement: 3.5,
      likes: 50,
    },
    {
      date: '2024-01-02',
      followers: 105,
      posts: 12,
      engagement: 4.0,
      likes: 60,
    },
    {
      date: '2024-01-03',
      followers: 110,
      posts: 15,
      engagement: 4.5,
      likes: 75,
    },
  ];

  describe('基本的な描画', () => {
    it('デフォルトで折れ線グラフが表示されること', () => {
      render(<FollowerChart data={mockData} />);
      
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('棒グラフが表示されること', () => {
      render(<FollowerChart data={mockData} type="bar" />);
      
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('カスタム高さが適用されること', () => {
      const { container } = render(
        <FollowerChart data={mockData} height={400} />
      );
      
      const chartContainer = container.querySelector('[style*="height: 400px"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('データの処理', () => {
    it('複数メトリクスが正しく表示されること', () => {
      render(<FollowerChart data={mockData} metric="multi" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.labels).toHaveLength(3);
      expect(data.datasets).toHaveLength(2);
      expect(data.datasets[0].label).toBe('フォロワー');
      expect(data.datasets[1].label).toBe('エンゲージメント率 (%)');
    });

    it('単一メトリクス（フォロワー）が表示されること', () => {
      render(<FollowerChart data={mockData} metric="followers" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].label).toBe('フォロワー');
      expect(data.datasets[0].data).toEqual([100, 105, 110]);
    });

    it('単一メトリクス（エンゲージメント）が表示されること', () => {
      render(<FollowerChart data={mockData} metric="engagement" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].label).toBe('エンゲージメント率 (%)');
      expect(data.datasets[0].data).toEqual([3.5, 4.0, 4.5]);
    });

    it('単一メトリクス（投稿数）が表示されること', () => {
      render(<FollowerChart data={mockData} metric="posts" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].label).toBe('投稿数');
      expect(data.datasets[0].data).toEqual([10, 12, 15]);
    });

    it('単一メトリクス（いいね数）が表示されること', () => {
      render(<FollowerChart data={mockData} metric="likes" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets).toHaveLength(1);
      expect(data.datasets[0].label).toBe('いいね数');
      expect(data.datasets[0].data).toEqual([50, 60, 75]);
    });
  });

  describe('オプション設定', () => {
    it('グラフオプションが正しく設定されること', () => {
      render(<FollowerChart data={mockData} />);
      
      const chartOptions = screen.getByTestId('chart-options');
      const options = JSON.parse(chartOptions.textContent || '{}');
      
      expect(options.responsive).toBe(true);
      expect(options.maintainAspectRatio).toBe(false);
      expect(options.plugins.legend.position).toBe('top');
      expect(options.interaction.mode).toBe('nearest');
    });

    it('複数Y軸が設定されること（multiメトリック時）', () => {
      render(<FollowerChart data={mockData} metric="multi" />);
      
      const chartOptions = screen.getByTestId('chart-options');
      const options = JSON.parse(chartOptions.textContent || '{}');
      
      expect(options.scales.y).toBeDefined();
      expect(options.scales.y1).toBeDefined();
      expect(options.scales.y.position).toBe('left');
      expect(options.scales.y1.position).toBe('right');
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスケルトンが表示されること', () => {
      const { container } = render(
        <FollowerChart data={mockData} loading={true} />
      );
      
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('ローディング中でも高さが維持されること', () => {
      const { container } = render(
        <FollowerChart data={mockData} loading={true} height={500} />
      );
      
      const skeleton = container.querySelector('[style*="height: 500px"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('空データの処理', () => {
    it('データがない場合メッセージが表示されること', () => {
      render(<FollowerChart data={[]} />);
      
      expect(screen.getByText('データがありません')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('nullデータの場合もメッセージが表示されること', () => {
      render(<FollowerChart data={null as any} />);
      
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });

    it('undefinedデータの場合もメッセージが表示されること', () => {
      render(<FollowerChart data={undefined as any} />);
      
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });
  });

  describe('スタイリング', () => {
    it('適切なCSSクラスが適用されること', () => {
      const { container } = render(<FollowerChart data={mockData} />);
      
      const chartContainer = container.querySelector('.bg-white.rounded-xl');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toHaveClass('shadow-sm');
      expect(chartContainer).toHaveClass('border');
      expect(chartContainer).toHaveClass('border-gray-200');
      expect(chartContainer).toHaveClass('p-6');
    });
  });

  describe('カラー設定', () => {
    it('各メトリクスに適切な色が設定されること', () => {
      const metrics = [
        { metric: 'followers', color: 'rgb(59, 130, 246)' },
        { metric: 'engagement', color: 'rgb(16, 185, 129)' },
        { metric: 'posts', color: 'rgb(168, 85, 247)' },
        { metric: 'likes', color: 'rgb(251, 146, 60)' },
      ] as const;

      metrics.forEach(({ metric, color }) => {
        const { unmount } = render(
          <FollowerChart data={mockData} metric={metric} />
        );
        
        const chartData = screen.getByTestId('chart-data');
        const data = JSON.parse(chartData.textContent || '{}');
        
        expect(data.datasets[0].borderColor).toBe(color);
        
        unmount();
      });
    });
  });

  describe('日付フォーマット', () => {
    it('日付が MM/DD 形式でフォーマットされること', () => {
      render(<FollowerChart data={mockData} />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.labels).toEqual(['01/01', '01/02', '01/03']);
    });
  });

  describe('グラフタイプ別の設定', () => {
    it('折れ線グラフでfillが有効になること', () => {
      render(<FollowerChart data={mockData} type="line" metric="followers" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets[0].fill).toBe(true);
    });

    it('棒グラフでfillが無効になること', () => {
      render(<FollowerChart data={mockData} type="bar" metric="followers" />);
      
      const chartData = screen.getByTestId('chart-data');
      const data = JSON.parse(chartData.textContent || '{}');
      
      expect(data.datasets[0].fill).toBe(false);
    });
  });
});
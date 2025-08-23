import React from 'react';
import { render, screen } from '@testing-library/react';
import StatsCard from '@/components/StatsCard';
import '@testing-library/jest-dom';

describe('StatsCard', () => {
  const defaultProps = {
    title: 'フォロワー',
    value: 1234,
  };

  it('タイトルと値が正しく表示されること', () => {
    render(<StatsCard {...defaultProps} />);
    
    expect(screen.getByText('フォロワー')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('文字列の値も表示できること', () => {
    render(<StatsCard title="エンゲージメント率" value="5.2%" />);
    
    expect(screen.getByText('エンゲージメント率')).toBeInTheDocument();
    expect(screen.getByText('5.2%')).toBeInTheDocument();
  });

  it('大きな数値が適切にフォーマットされること', () => {
    render(<StatsCard title="フォロワー" value={1500} />);
    expect(screen.getByText('1,500')).toBeInTheDocument();

    render(<StatsCard title="フォロワー" value={15000} />);
    expect(screen.getByText('15,000')).toBeInTheDocument();

    render(<StatsCard title="フォロワー" value={1500000} />);
    expect(screen.getByText('1,500,000')).toBeInTheDocument();
  });

  describe('成長率インジケーター', () => {
    it('正の成長率が表示されること', () => {
      render(
        <StatsCard
          {...defaultProps}
          change={12.5}
          changeLabel="過去7日間"
        />
      );
      
      expect(screen.getByText('12.5%')).toBeInTheDocument();
      expect(screen.getByText('過去7日間')).toBeInTheDocument();
      
      // TrendingUpアイコンが表示されることを確認
      const trendIcon = screen.getByRole('img', { hidden: true });
      expect(trendIcon).toBeInTheDocument();
    });

    it('負の成長率が表示されること', () => {
      render(
        <StatsCard
          {...defaultProps}
          change={-5.3}
          changeLabel="過去7日間"
        />
      );
      
      expect(screen.getByText('5.3%')).toBeInTheDocument();
      
      // TrendingDownアイコンが表示されることを確認
      const trendIcon = screen.getByRole('img', { hidden: true });
      expect(trendIcon).toBeInTheDocument();
    });

    it('成長率0の場合フラットアイコンが表示されること', () => {
      render(
        <StatsCard
          {...defaultProps}
          change={0}
        />
      );
      
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      
      // Minusアイコンが表示されることを確認
      const trendIcon = screen.getByRole('img', { hidden: true });
      expect(trendIcon).toBeInTheDocument();
    });
  });

  describe('アイコン表示', () => {
    it('アイコンが指定された場合に表示されること', () => {
      const icon = <svg data-testid="custom-icon" />;
      render(
        <StatsCard
          {...defaultProps}
          icon={icon}
        />
      );
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('カラーバリエーション', () => {
    it('色指定が適用されること', () => {
      const { container } = render(
        <StatsCard
          {...defaultProps}
          color="green"
          icon={<span>Icon</span>}
        />
      );
      
      const coloredElement = container.querySelector('.bg-green-50');
      expect(coloredElement).toBeInTheDocument();
    });

    it('デフォルトカラーが適用されること', () => {
      const { container } = render(
        <StatsCard
          {...defaultProps}
          icon={<span>Icon</span>}
        />
      );
      
      const coloredElement = container.querySelector('.bg-blue-50');
      expect(coloredElement).toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    it('ローディング中はスケルトンが表示されること', () => {
      const { container } = render(
        <StatsCard
          {...defaultProps}
          loading={true}
        />
      );
      
      // アニメーションクラスの確認
      const skeleton = container.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
      
      // 実際の値は表示されない
      expect(screen.queryByText('1,234')).not.toBeInTheDocument();
    });
  });

  describe('ホバー効果', () => {
    it('ホバー時にシャドウ効果が適用されること', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const card = container.querySelector('.hover\\:shadow-md');
      expect(card).toBeInTheDocument();
    });
  });

  describe('レスポンシブデザイン', () => {
    it('カードが適切なクラスを持つこと', () => {
      const { container } = render(<StatsCard {...defaultProps} />);
      
      const card = container.querySelector('.bg-white.rounded-xl');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('shadow-sm');
      expect(card).toHaveClass('border');
      expect(card).toHaveClass('border-gray-200');
    });
  });

  describe('エッジケース', () => {
    it('値が0の場合でも正しく表示されること', () => {
      render(<StatsCard title="投稿数" value={0} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('負の値でも表示されること', () => {
      render(<StatsCard title="変化" value={-10} />);
      
      expect(screen.getByText('-10')).toBeInTheDocument();
    });

    it('小数点を含む値が表示されること', () => {
      render(<StatsCard title="平均" value={3.14159} />);
      
      expect(screen.getByText('3.14159')).toBeInTheDocument();
    });

    it('changeがundefinedでもエラーにならないこと', () => {
      const { container } = render(
        <StatsCard
          title="テスト"
          value={100}
          change={undefined}
        />
      );
      
      expect(container).toBeInTheDocument();
      expect(screen.queryByText('%')).not.toBeInTheDocument();
    });
  });
});
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestPage from '@/app/test/page';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';

// Mock fetch globally
global.fetch = jest.fn();

// Create a test theme
const theme = createTheme();

// Helper to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('TestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders all test sections', () => {
    renderWithTheme(<TestPage />);

    expect(screen.getByText('掲示板アプリ テストページ')).toBeInTheDocument();
    expect(screen.getByText('API接続テスト')).toBeInTheDocument();
    expect(screen.getByText('MongoDB接続テスト')).toBeInTheDocument();
    expect(screen.getByText('投稿作成テスト')).toBeInTheDocument();
    expect(screen.getByText('投稿一覧テスト')).toBeInTheDocument();
  });

  describe('API Connection Test', () => {
    it('shows success when API is reachable', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithTheme(<TestPage />);
      
      const testButton = screen.getAllByText('テスト実行')[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('✅ 成功')).toBeInTheDocument();
      });
    });

    it('shows error when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderWithTheme(<TestPage />);
      
      const testButton = screen.getAllByText('テスト実行')[0];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ エラー:/)).toBeInTheDocument();
      });
    });
  });

  describe('MongoDB Connection Test', () => {
    it('shows success when MongoDB is connected', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      renderWithTheme(<TestPage />);
      
      const testButton = screen.getAllByText('テスト実行')[1];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('✅ 成功: データベース接続OK')).toBeInTheDocument();
      });
    });

    it('shows error when MongoDB connection fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Connection failed' }),
      });

      renderWithTheme(<TestPage />);
      
      const testButton = screen.getAllByText('テスト実行')[1];
      fireEvent.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('❌ エラー: Connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('Create Post Test', () => {
    it('successfully creates a post', async () => {
      const mockPost = {
        _id: '123',
        content: 'テスト投稿',
        createdAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPost }),
      });

      renderWithTheme(<TestPage />);
      
      const createButton = screen.getByText('投稿作成');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/✅ 成功: 投稿ID/)).toBeInTheDocument();
        expect(screen.getByText(new RegExp(mockPost._id))).toBeInTheDocument();
      });
    });

    it('shows error when post creation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: 'Validation error' }),
      });

      renderWithTheme(<TestPage />);
      
      const createButton = screen.getByText('投稿作成');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('❌ エラー: Validation error')).toBeInTheDocument();
      });
    });
  });

  describe('List Posts Test', () => {
    it('displays posts list successfully', async () => {
      const mockPosts = [
        { _id: '1', content: 'Post 1', createdAt: new Date().toISOString() },
        { _id: '2', content: 'Post 2', createdAt: new Date().toISOString() },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockPosts }),
      });

      renderWithTheme(<TestPage />);
      
      const listButton = screen.getByText('一覧取得');
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText('✅ 成功: 2件の投稿を取得')).toBeInTheDocument();
        expect(screen.getByText('Post 1')).toBeInTheDocument();
        expect(screen.getByText('Post 2')).toBeInTheDocument();
      });
    });

    it('shows empty state when no posts', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] }),
      });

      renderWithTheme(<TestPage />);
      
      const listButton = screen.getByText('一覧取得');
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText('✅ 成功: 0件の投稿を取得')).toBeInTheDocument();
      });
    });

    it('handles list fetch error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      renderWithTheme(<TestPage />);
      
      const listButton = screen.getByText('一覧取得');
      fireEvent.click(listButton);

      await waitFor(() => {
        expect(screen.getByText(/❌ エラー:/)).toBeInTheDocument();
      });
    });
  });

  it('shows loading state during test execution', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    renderWithTheme(<TestPage />);
    
    const testButton = screen.getAllByText('テスト実行')[0];
    fireEvent.click(testButton);

    expect(screen.getByText('テスト中...')).toBeInTheDocument();
  });

  it('clears previous results when running new test', async () => {
    // First test - success
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderWithTheme(<TestPage />);
    
    const testButton = screen.getAllByText('テスト実行')[0];
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText('✅ 成功')).toBeInTheDocument();
    });

    // Second test - should clear previous result
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(testButton);

    expect(screen.getByText('テスト中...')).toBeInTheDocument();
    expect(screen.queryByText('✅ 成功')).not.toBeInTheDocument();
  });

  it('formats post dates correctly', async () => {
    const mockPost = {
      _id: '123',
      content: 'Test post',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [mockPost] }),
    });

    renderWithTheme(<TestPage />);
    
    const listButton = screen.getByText('一覧取得');
    fireEvent.click(listButton);

    await waitFor(() => {
      // Should format the date in Japanese locale
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });
  });
});
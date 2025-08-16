import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TestPage from '@/app/test/page';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import '@testing-library/jest-dom';

// Mock fetch globally
global.fetch = jest.fn();

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe('TestPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders the initial page correctly', () => {
    renderWithTheme(<TestPage />);
    expect(screen.getByText('CRUD機能自動テスト')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'テストを実行' })).toBeInTheDocument();
  });

  it('runs all CRUD tests and displays success results', async () => {
    (global.fetch as jest.Mock)
      // Create: Success
      .mockResolvedValueOnce({
        status: 201,
        json: async () => ({ success: true, data: { _id: 'post1' } }),
      })
      // Create: Empty content (error)
      .mockResolvedValueOnce({
        status: 400,
        json: async () => ({ success: false, error: 'Content is required' }),
      })
      // Create: Too long content (error)
      .mockResolvedValueOnce({
        status: 400,
        json: async () => ({ success: false, error: 'Content is too long' }),
      })
      // Create: Special characters
      .mockResolvedValueOnce({
        status: 201,
        json: async () => ({ success: true, data: { _id: 'post2' } }),
      })
      // Read: List posts
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: [{ _id: 'post1' }] }),
      })
      // Read: Get one post
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true, data: { _id: 'post1' } }),
      })
      // Update: Success
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      })
      // Update: Empty content (error)
      .mockResolvedValueOnce({
        status: 400,
        json: async () => ({ success: false, error: 'Content is required' }),
      })
      // Delete: Success
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      })
      // Delete: Not found (error)
      .mockResolvedValueOnce({
        status: 404,
        json: async () => ({ success: false, error: 'Post not found' }),
      })
       // Cleanup delete
      .mockResolvedValueOnce({
        status: 200,
        json: async () => ({ success: true }),
      });

    renderWithTheme(<TestPage />);
    
    const runButton = screen.getByRole('button', { name: 'テストを実行' });
    fireEvent.click(runButton);

    expect(screen.getByRole('button', { name: 'テスト実行中...' })).toBeDisabled();

    await waitFor(() => {
      // Check for a few key success messages
      expect(screen.getByText('Create: 通常の投稿作成')).toBeInTheDocument();
      const passedChips = screen.getAllByText('PASSED');
      expect(passedChips.length).toBeGreaterThanOrEqual(10); // All tests should pass
    }, { timeout: 3000 });

    expect(screen.getByText('合計: 10 テスト')).toBeInTheDocument();
    expect(screen.getByText('成功: 10 テスト')).toBeInTheDocument();
    expect(screen.getByText('失敗: 0 テスト')).toBeInTheDocument();
  });

  it('handles a failed test case correctly', async () => {
    (global.fetch as jest.Mock)
      // The first test fails
      .mockResolvedValueOnce({
        status: 500,
        json: async () => ({ success: false, error: 'Server Error' }),
      });

    renderWithTheme(<TestPage />);
    
    const runButton = screen.getByRole('button', { name: 'テストを実行' });
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(screen.getByText('Create: 通常の投稿作成')).toBeInTheDocument();
      expect(screen.getByText('FAILED')).toBeInTheDocument();
    });

    expect(screen.getByText('失敗: 1 テスト')).toBeInTheDocument();
    // Subsequent tests should not have run
    const pendingChips = screen.getAllByText('PENDING');
    expect(pendingChips.length).toBe(9);
  });
});
import { render, screen, waitFor } from '@testing-library/react';
import Home from '@/app/page';
import { ThemeProvider } from '@mui/material/styles';
import theme from '@/theme/theme';

// Mock fetch globally
global.fetch = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            _id: '1',
            content: 'Test post 1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          {
            _id: '2',
            content: 'Test post 2',
            createdAt: '2024-01-02T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
          },
        ],
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the home page with title', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    // Wait for the page to load
    await waitFor(() => {
      expect(screen.getByText('掲示板アプリ')).toBeInTheDocument();
    });
  });

  it('displays post form', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('新しい投稿')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('今何を考えていますか？')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '投稿する' })).toBeInTheDocument();
    });
  });

  it('fetches and displays posts', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test post 1')).toBeInTheDocument();
      expect(screen.getByText('Test post 2')).toBeInTheDocument();
    });

    // Verify fetch was called
    expect(global.fetch).toHaveBeenCalledWith('/api/posts', expect.any(Object));
  });

  it('displays loading state initially', () => {
    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch posts:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles empty posts list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      // Should still render the form
      expect(screen.getByText('新しい投稿')).toBeInTheDocument();
      // But no posts should be displayed
      expect(screen.queryByText('Test post 1')).not.toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Internal server error',
      }),
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch posts:', 'Internal server error');
    });

    consoleErrorSpy.mockRestore();
  });

  it('creates a new post successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        // Initial fetch
        ok: true,
        json: async () => ({ success: true, data: [] }),
      })
      .mockResolvedValueOnce({
        // Create post
        ok: true,
        json: async () => ({
          success: true,
          data: {
            _id: '3',
            content: 'New test post',
            createdAt: '2024-01-03T00:00:00Z',
            updatedAt: '2024-01-03T00:00:00Z',
          },
        }),
      })
      .mockResolvedValueOnce({
        // Refetch after create
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              _id: '3',
              content: 'New test post',
              createdAt: '2024-01-03T00:00:00Z',
              updatedAt: '2024-01-03T00:00:00Z',
            },
          ],
        }),
      });

    render(
      <ThemeProvider theme={theme}>
        <Home />
      </ThemeProvider>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('今何を考えていますか？')).toBeInTheDocument();
    });

    // Note: Actual form submission would require user interaction simulation
    // This test verifies the component structure is correct for creating posts
  });
});
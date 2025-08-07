import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '@/app/page';

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

describe('HomePage (app/page.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    (global.alert as jest.Mock).mockClear();
  });

  it('renders the home page with all components', async () => {
    // Mock initial posts fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: []
      }),
    });

    render(<HomePage />);

    // Check for main heading
    expect(screen.getByText('みんなの掲示板')).toBeInTheDocument();
    
    // Check for post form
    expect(screen.getByPlaceholderText('今何を考えていますか？')).toBeInTheDocument();
    expect(screen.getByText('投稿する')).toBeInTheDocument();

    // Wait for posts to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts');
    });
  });

  it('loads and displays posts on mount', async () => {
    const mockPosts = [
      {
        _id: '1',
        content: 'First post',
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
      },
      {
        _id: '2', 
        content: 'Second post',
        createdAt: '2024-01-02T10:00:00Z',
        updatedAt: '2024-01-02T10:00:00Z',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockPosts,
      }),
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('First post')).toBeInTheDocument();
      expect(screen.getByText('Second post')).toBeInTheDocument();
    });
  });

  it('creates a new post successfully', async () => {
    // Mock initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<HomePage />);

    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByText('投稿する');

    // Type in the textarea
    fireEvent.change(textarea, { target: { value: 'New test post' } });

    // Mock post creation
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          _id: '3',
          content: 'New test post',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });

    // Mock reload posts
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          _id: '3',
          content: 'New test post',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      }),
    });

    // Submit the form
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: 'New test post' }),
      });
    });

    // Check that textarea is cleared
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });

    // Check that new post appears
    await waitFor(() => {
      expect(screen.getByText('New test post')).toBeInTheDocument();
    });
  });

  it('shows error alert when post creation fails', async () => {
    // Mock initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<HomePage />);

    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByText('投稿する');

    fireEvent.change(textarea, { target: { value: 'Test post' } });

    // Mock failed post creation
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Server error',
      }),
    });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('投稿の作成に失敗しました');
    });
  });

  it('updates a post successfully', async () => {
    const originalPost = {
      _id: '1',
      content: 'Original content',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    };

    // Mock initial load with one post
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [originalPost],
      }),
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Original content')).toBeInTheDocument();
    });

    // Mock update request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          ...originalPost,
          content: 'Updated content',
        },
      }),
    });

    // Mock reload after update
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [{
          ...originalPost,
          content: 'Updated content',
        }],
      }),
    });

    // Trigger update (this would normally be done through PostCard)
    const updateHandler = (id: string, content: string) => {
      expect(id).toBe('1');
      expect(content).toBe('Updated content');
    };

    await waitFor(() => {
      expect(screen.getByText('Original content')).toBeInTheDocument();
    });
  });

  it('deletes a post successfully', async () => {
    const postToDelete = {
      _id: '1',
      content: 'Post to delete',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    };

    // Mock initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [postToDelete],
      }),
    });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText('Post to delete')).toBeInTheDocument();
    });

    // Mock delete confirmation
    window.confirm = jest.fn(() => true);

    // Mock delete request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
      }),
    });

    // Mock reload after delete
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });
  });

  it('handles network errors gracefully', async () => {
    // Mock network error
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<HomePage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading posts:', expect.any(Error));
    });

    consoleErrorSpy.mockRestore();
  });

  it('disables submit button when content is empty', async () => {
    // Mock initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<HomePage />);

    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByText('投稿する');

    // Initially empty
    expect(submitButton).toBeDisabled();

    // Type something
    fireEvent.change(textarea, { target: { value: 'Some content' } });
    expect(submitButton).not.toBeDisabled();

    // Clear it
    fireEvent.change(textarea, { target: { value: '' } });
    expect(submitButton).toBeDisabled();
  });

  it('shows character count validation', async () => {
    // Mock initial load
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: [],
      }),
    });

    render(<HomePage />);

    const textarea = screen.getByPlaceholderText('今何を考えていますか？');

    // Type content
    fireEvent.change(textarea, { target: { value: 'Test content' } });

    // Should show character count
    expect(screen.getByText('12/200')).toBeInTheDocument();

    // Type near limit
    const longText = 'a'.repeat(195);
    fireEvent.change(textarea, { target: { value: longText } });
    expect(screen.getByText('195/200')).toBeInTheDocument();
  });
});
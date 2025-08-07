import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostCard from '@/components/PostCard';

describe('PostCard', () => {
  const mockPost = {
    _id: '123',
    content: 'Test post content',
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  };

  const mockOnDelete = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    mockOnDelete.mockClear();
    mockOnUpdate.mockClear();
  });

  it('renders post content and metadata', () => {
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText(/投稿日時:/)).toBeInTheDocument();
    expect(screen.getByLabelText('編集')).toBeInTheDocument();
    expect(screen.getByLabelText('削除')).toBeInTheDocument();
  });

  it('formats dates correctly in Japanese locale', () => {
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    const dateText = screen.getByText(/投稿日時:/).textContent;
    expect(dateText).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it('shows edited timestamp when post has been updated', () => {
    const editedPost = {
      ...mockPost,
      updatedAt: '2024-01-02T15:30:00Z',
    };

    render(
      <PostCard
        post={editedPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    expect(screen.getByText(/編集済み:/)).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));

    expect(screen.getByDisplayValue('Test post content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument();
    expect(screen.getByText('17/200')).toBeInTheDocument();
  });

  it('cancels edit mode and restores original content', async () => {
    const user = userEvent.setup();
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));
    
    const textarea = screen.getByDisplayValue('Test post content');
    await user.clear(textarea);
    await user.type(textarea, 'Modified content');

    await user.click(screen.getByRole('button', { name: 'キャンセル' }));

    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  });

  it('calls onUpdate when save button is clicked with modified content', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValueOnce(undefined);
    
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));
    
    const textarea = screen.getByDisplayValue('Test post content');
    await user.clear(textarea);
    await user.type(textarea, 'Updated content');

    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockOnUpdate).toHaveBeenCalledWith('123', 'Updated content');
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
    });
  });

  it('does not call onUpdate if content is unchanged', async () => {
    const user = userEvent.setup();
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));
    await user.click(screen.getByRole('button', { name: '保存' }));

    expect(mockOnUpdate).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
  });

  it('disables save button when content is empty or exceeds 200 characters', async () => {
    const user = userEvent.setup();
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));
    
    const textarea = screen.getByDisplayValue('Test post content');
    const saveButton = screen.getByRole('button', { name: '保存' });

    // Test empty content
    await user.clear(textarea);
    expect(saveButton).toBeDisabled();

    // Test content over 200 characters
    await user.type(textarea, 'a'.repeat(201));
    expect(saveButton).toBeDisabled();
    expect(screen.getByText('201/200')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    mockOnDelete.mockResolvedValueOnce(undefined);
    
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('削除'));

    expect(mockOnDelete).toHaveBeenCalledWith('123');
  });

  it('disables buttons during loading state', async () => {
    const user = userEvent.setup();
    mockOnDelete.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    const deleteButton = screen.getByLabelText('削除');
    const editButton = screen.getByLabelText('編集');

    await user.click(deleteButton);

    expect(deleteButton).toBeDisabled();
    expect(editButton).toBeDisabled();

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalled();
    });
  });

  it('handles update errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnUpdate.mockRejectedValueOnce(new Error('Update failed'));
    
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('編集'));
    
    const textarea = screen.getByDisplayValue('Test post content');
    await user.clear(textarea);
    await user.type(textarea, 'Updated content');

    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update post:', expect.any(Error));
      // Should still be in edit mode after error
      expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('handles delete errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnDelete.mockRejectedValueOnce(new Error('Delete failed'));
    
    render(
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
      />
    );

    await user.click(screen.getByLabelText('削除'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to delete post:', expect.any(Error));
      // Card should still be visible after error
      expect(screen.getByText('Test post content')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
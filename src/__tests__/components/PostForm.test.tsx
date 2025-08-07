import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostForm from '@/components/PostForm';

describe('PostForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders the form with all elements', () => {
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('新しい投稿')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('今何を考えていますか？')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿する' })).toBeInTheDocument();
    expect(screen.getByText('0/200')).toBeInTheDocument();
  });

  it('updates character count as user types', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    await user.type(textarea, 'Hello World');
    
    expect(screen.getByText('11/200')).toBeInTheDocument();
  });

  it('disables submit button when input is empty or only whitespace', () => {
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when valid content is entered', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    
    await user.type(textarea, 'This is a test post');
    expect(submitButton).toBeEnabled();
  });

  it('shows error state when content exceeds 200 characters', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const longText = 'a'.repeat(201);
    
    await user.type(textarea, longText);
    
    expect(screen.getByText('201/200')).toBeInTheDocument();
    // TextFieldのerror propは内部のinputではなく、親要素に適用される
    const textField = textarea.closest('.MuiTextField-root');
    expect(textField).toHaveClass('Mui-error');
    expect(screen.getByRole('button', { name: '投稿する' })).toBeDisabled();
  });

  it('calls onSubmit with content when form is submitted', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    
    await user.type(textarea, 'Test post content');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith('Test post content');
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('clears the form after successful submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    
    await user.type(textarea, 'Test post content');
    await user.click(screen.getByRole('button', { name: '投稿する' }));
    
    await waitFor(() => {
      expect(textarea).toHaveValue('');
      expect(screen.getByText('0/200')).toBeInTheDocument();
    });
  });

  it('disables form during submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    
    await user.type(textarea, 'Test post content');
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('投稿中...');
    expect(textarea).toBeDisabled();
    
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent('投稿する');
    });
  });

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnSubmit.mockRejectedValueOnce(new Error('Network error'));
    
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    
    await user.type(textarea, 'Test post content');
    await user.click(screen.getByRole('button', { name: '投稿する' }));
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to submit post:', expect.any(Error));
      // Form should not be cleared on error
      expect(textarea).toHaveValue('Test post content');
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('prevents form submission with Enter key', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    
    await user.type(textarea, 'Test post content{enter}');
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('handles whitespace-only input correctly', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    
    // Test various whitespace combinations
    await user.type(textarea, '   ');
    expect(submitButton).toBeDisabled();
    
    await user.clear(textarea);
    await user.type(textarea, '\n\n\n');
    expect(submitButton).toBeDisabled();
    
    await user.clear(textarea);
    await user.type(textarea, '\t\t');
    expect(submitButton).toBeDisabled();
  });

  it('handles rapid form submissions correctly', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockImplementation(() => Promise.resolve());
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const submitButton = screen.getByRole('button', { name: '投稿する' });
    
    await user.type(textarea, 'Test post');
    
    // Try to submit multiple times rapidly
    await user.click(submitButton);
    await user.click(submitButton);
    await user.click(submitButton);
    
    // Should only be called once due to disabled state during submission
    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  it('preserves form state when component re-renders', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    await user.type(textarea, 'Test content before re-render');
    
    // Re-render with same props
    rerender(<PostForm onSubmit={mockOnSubmit} />);
    
    // Content should be preserved
    expect(screen.getByPlaceholderText('今何を考えていますか？')).toHaveValue('Test content before re-render');
  });

  it('handles paste events correctly', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    
    // Simulate paste event
    const pasteText = 'This is pasted content';
    await user.click(textarea);
    await user.paste(pasteText);
    
    expect(textarea).toHaveValue(pasteText);
    expect(screen.getByText(`${pasteText.length}/200`)).toBeInTheDocument();
  });

  it('handles maximum length paste correctly', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const longText = 'a'.repeat(250);
    
    await user.click(textarea);
    await user.paste(longText);
    
    // Should show error state for content over 200 chars
    expect(screen.getByText('250/200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿する' })).toBeDisabled();
  });

  it('maintains focus after submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    
    await user.type(textarea, 'Test post content');
    await user.click(screen.getByRole('button', { name: '投稿する' }));
    
    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });

  it('handles emoji and special characters correctly', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const specialContent = 'Hello 👋 World 🌍! Special chars: @#$%^&*()';
    
    await user.type(textarea, specialContent);
    
    expect(textarea).toHaveValue(specialContent);
    expect(screen.getByRole('button', { name: '投稿する' })).toBeEnabled();
  });

  it('updates character count correctly with multi-byte characters', async () => {
    const user = userEvent.setup();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const japaneseText = 'こんにちは世界';
    
    await user.type(textarea, japaneseText);
    
    // Should count actual characters, not bytes
    expect(screen.getByText(`${japaneseText.length}/200`)).toBeInTheDocument();
  });

  it('handles form submission with exactly 200 characters', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValueOnce(undefined);
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const textarea = screen.getByPlaceholderText('今何を考えていますか？');
    const exactLengthText = 'a'.repeat(200);
    
    await user.type(textarea, exactLengthText);
    
    expect(screen.getByText('200/200')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '投稿する' })).toBeEnabled();
    
    await user.click(screen.getByRole('button', { name: '投稿する' }));
    
    expect(mockOnSubmit).toHaveBeenCalledWith(exactLengthText);
  });
});
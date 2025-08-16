import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostForm from '@/components/PostForm';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// next/navigationのモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('PostForm', () => {
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it('renders a "Create New Post" button', () => {
    // onSubmitのモック関数
    const mockOnSubmit = jest.fn();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const createButton = screen.getByRole('button', { name: /新規投稿を作成/i });
    expect(createButton).toBeInTheDocument();
  });

  it('navigates to the new post page when the button is clicked', () => {
    const mockOnSubmit = jest.fn();
    render(<PostForm onSubmit={mockOnSubmit} />);
    
    const createButton = screen.getByRole('button', { name: /新規投稿を作成/i });
    fireEvent.click(createButton);
    
    expect(mockPush).toHaveBeenCalledWith('/posts/new');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostCard from '@/components/PostCard';
import { SessionProvider } from 'next-auth/react';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockPost = {
  _id: '123',
  title: 'Test Title',
  content: 'Test post content',
  authorId: 'user1',
  authorName: 'Test User',
  authorEmail: 'test@example.com',
  createdAt: '2024-01-01T10:00:00Z',
  updatedAt: '2024-01-01T10:00:00Z',
  likes: [],
  likesCount: 0,
};

const mockSession = {
  user: {
    id: 'user1',
  },
};

const mockOnDelete = jest.fn();
const mockOnUpdate = jest.fn();

const renderComponent = (session = mockSession) => {
  render(
    <SessionProvider session={session}>
      <PostCard
        post={mockPost}
        onDelete={mockOnDelete}
        onUpdate={mockOnUpdate}
        currentUserId="user1"
      />
    </SessionProvider>
  );
};

describe('PostCard', () => {
  beforeEach(() => {
    mockOnDelete.mockClear();
    mockOnUpdate.mockClear();
    mockPush.mockClear();
  });

  it('renders post content and metadata', () => {
    renderComponent();
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test post content')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument();
  });

  it('shows formatted date correctly', () => {
    renderComponent();
    expect(screen.getByText(/2024年1月1日/)).toBeInTheDocument();
  });

  it('shows edited timestamp when post has been updated', () => {
    const updatedPost = { ...mockPost, updatedAt: '2024-01-01T11:00:00Z' };
    render(
      <SessionProvider session={mockSession}>
        <PostCard
          post={updatedPost}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
          currentUserId="user1"
        />
      </SessionProvider>
    );
    expect(screen.getByText(/編集済み/)).toBeInTheDocument();
  });

  it('navigates to edit page when edit button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: '編集' }));

    expect(mockPush).toHaveBeenCalledWith('/posts/123/edit');
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: '削除' }));

    expect(mockOnDelete).toHaveBeenCalledWith('123');
  });

  it('shows like button and count', () => {
    renderComponent();
    
    // いいねボタンが存在することを確認
    const likeButtons = screen.getAllByRole('button');
    const likeButton = likeButtons.find(button => 
      button.querySelector('[data-testid="FavoriteBorderIcon"]')
    );
    expect(likeButton).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // いいね数
  });

  it('shows owner chip when user owns the post', () => {
    renderComponent();
    expect(screen.getByText('あなたの投稿')).toBeInTheDocument();
  });

  it('does not show owner chip when user does not own the post', () => {
    const differentPost = { ...mockPost, authorId: 'different-user' };
    render(
      <SessionProvider session={mockSession}>
        <PostCard
          post={differentPost}
          onDelete={mockOnDelete}
          onUpdate={mockOnUpdate}
          currentUserId="user1"
        />
      </SessionProvider>
    );
    
    expect(screen.queryByText('あなたの投稿')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument();
  });

  it('navigates to post detail when detail button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: '詳細を見る' }));

    expect(mockPush).toHaveBeenCalledWith('/posts/123');
  });
});
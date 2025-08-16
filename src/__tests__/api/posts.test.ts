import { GET, POST } from '../../../app/api/posts/route';
import { createMockNextRequest } from '../helpers/next-mocks';
import Post from '@/models/Post';
import { getServerSession } from 'next-auth/next';

// Mock the dependencies
const mockDbConnect = jest.fn().mockResolvedValue(undefined);
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: mockDbConnect
}));
jest.mock('@/models/Post');
jest.mock('mongoose');
jest.mock('next-auth/next');
jest.mock('@/lib/sanitizer', () => ({
  sanitizePostInput: jest.fn((title, content) => ({ title, content }))
}));

describe('/api/posts', () => {
  const mockPost = Post as jest.Mocked<typeof Post>;
  const mockGetServerSession = getServerSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined);
  });

  describe('GET /api/posts', () => {
    it('returns all posts sorted by creation date with pagination', async () => {
      const mockPosts = [
        { 
          _id: '1', 
          title: 'Post 1',
          content: 'Content 1', 
          authorId: 'user1',
          authorName: 'User 1',
          authorEmail: 'user1@example.com',
          likes: [],
          likesCount: 0,
          createdAt: new Date('2024-01-02'), 
          updatedAt: new Date('2024-01-02') 
        },
        { 
          _id: '2', 
          title: 'Post 2',
          content: 'Content 2', 
          authorId: 'user2',
          authorName: 'User 2',
          authorEmail: 'user2@example.com',
          likes: [],
          likesCount: 0,
          createdAt: new Date('2024-01-01'), 
          updatedAt: new Date('2024-01-01') 
        },
      ];

      mockPost.countDocuments.mockResolvedValue(2);
      mockPost.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockPosts)
            })
          })
        })
      } as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts');
      const response = await GET(request);
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.find).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosts);
      expect(data.pagination).toBeDefined();
      expect(data.pagination.totalCount).toBe(2);
      expect(response.status).toBe(200);
    });

    it('handles database connection errors', async () => {
      mockDbConnect.mockRejectedValue(new Error('Connection failed'));

      const request = createMockNextRequest('http://localhost:3000/api/posts');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error).toBe('投稿の取得に失敗しました');
      expect(response.status).toBe(500);
    });

    it('handles query errors', async () => {
      mockPost.countDocuments.mockResolvedValue(0);
      mockPost.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockRejectedValue(new Error('Query failed'))
            })
          })
        })
      } as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts');
      const response = await GET(request);
      const data = await response.json();

      expect(data.error).toBe('投稿の取得に失敗しました');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/posts', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'user123',
          name: 'Test User',
          email: 'test@example.com',
          image: null,
        },
      });
    });

    it('creates a new post with valid title and content', async () => {
      const mockCreatedPost = {
        _id: '123',
        title: 'Test Title',
        content: 'Test post content',
        authorId: 'user123',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
        authorImage: null,
        likes: [],
        likesCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPost.create.mockResolvedValue(mockCreatedPost as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Title', content: 'Test post content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.create).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Title',
        content: 'Test post content',
        authorId: 'user123',
        authorName: 'Test User',
        authorEmail: 'test@example.com',
      }));
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockCreatedPost);
      expect(response.status).toBe(201);
    });

    it('requires authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Test content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('ログインが必要です');
      expect(response.status).toBe(401);
    });

    it('rejects posts without title', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('タイトルを入力してください');
      expect(response.status).toBe(400);
    });

    it('rejects posts without content', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Title' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('本文を入力してください');
      expect(response.status).toBe(400);
    });

    it('rejects posts with title exceeding 100 characters', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'a'.repeat(101),
          content: 'Test content' 
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('タイトルは100文字以内で入力してください');
      expect(response.status).toBe(400);
    });

    it('rejects posts with content exceeding 1000 characters', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Test Title',
          content: 'a'.repeat(1001) 
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('本文は1000文字以内で入力してください');
      expect(response.status).toBe(400);
    });

    it('handles database errors gracefully', async () => {
      mockPost.create.mockRejectedValue(new Error('Database error'));

      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test', content: 'Test content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.error).toBe('投稿の作成に失敗しました');
      expect(response.status).toBe(500);
    });
  });
});
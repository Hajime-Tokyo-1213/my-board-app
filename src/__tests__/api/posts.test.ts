import { GET, POST } from '../../../app/api/posts/route';
import { createMockNextRequest } from '../helpers/next-mocks';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

// Mock the dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Post');
jest.mock('mongoose');

describe('/api/posts', () => {
  const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;
  const mockPost = Post as jest.Mocked<typeof Post>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined as any);
  });

  describe('GET /api/posts', () => {
    it('returns all posts sorted by creation date', async () => {
      const mockPosts = [
        { _id: '1', content: 'Post 1', createdAt: new Date('2024-01-02'), updatedAt: new Date('2024-01-02') },
        { _id: '2', content: 'Post 2', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01') },
      ];

      mockPost.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockPosts),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.find).toHaveBeenCalledWith({});
      expect(data).toEqual({
        success: true,
        data: mockPosts,
      });
      expect(response.status).toBe(200);
    });

    it('handles database connection errors', async () => {
      mockDbConnect.mockRejectedValue(new Error('Connection failed'));

      const response = await GET();
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Connection failed',
        details: expect.any(String),
      });
      expect(response.status).toBe(500);
    });

    it('handles query errors', async () => {
      mockPost.find.mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Query failed')),
      } as any);

      const response = await GET();
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Query failed');
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/posts', () => {
    it('creates a new post with valid content', async () => {
      const mockCreatedPost = {
        _id: '123',
        content: 'Test post content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPost.create.mockResolvedValue(mockCreatedPost as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test post content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.create).toHaveBeenCalledWith({ content: 'Test post content' });
      expect(data).toEqual({
        success: true,
        data: mockCreatedPost,
      });
      expect(response.status).toBe(201);
    });

    it('rejects posts without content', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: '投稿内容は必須です',
      });
      expect(response.status).toBe(400);
      expect(mockPost.create).not.toHaveBeenCalled();
    });

    it('rejects posts with empty content', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: '投稿内容は必須です',
      });
      expect(response.status).toBe(400);
    });

    it('rejects posts exceeding 200 characters', async () => {
      const longContent = 'a'.repeat(201);
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: longContent }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: '投稿は200文字以内にしてください',
      });
      expect(response.status).toBe(400);
      expect(mockPost.create).not.toHaveBeenCalled();
    });

    it('handles database creation errors', async () => {
      mockPost.create.mockRejectedValue(new Error('Database error'));

      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test post content' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
      expect(response.status).toBe(500);
    });

    it('handles invalid JSON in request body', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: 'invalid json',
      });

      // Mock the json() method to throw an error
      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(response.status).toBe(500);
    });
  });
});
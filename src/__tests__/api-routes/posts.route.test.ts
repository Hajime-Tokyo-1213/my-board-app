/**
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/posts/route';
import { NextRequest } from 'next/server';

// Mock dbConnect
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock Post model
jest.mock('@/models/Post', () => ({
  __esModule: true,
  default: {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { _id: '1', content: 'Test post 1', createdAt: new Date(), updatedAt: new Date() },
        { _id: '2', content: 'Test post 2', createdAt: new Date(), updatedAt: new Date() },
      ]),
    }),
    create: jest.fn().mockImplementation((data) => Promise.resolve({
      _id: 'new-id',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  },
}));

describe('API Routes - /api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/posts', () => {
    it('returns all posts successfully', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].content).toBe('Test post 1');
    });

    it('handles database errors', async () => {
      const Post = require('@/models/Post').default;
      Post.find.mockReturnValueOnce({
        sort: jest.fn().mockRejectedValueOnce(new Error('Database error')),
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });

  describe('POST /api/posts', () => {
    it('creates a new post successfully', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'New test post' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('New test post');
    });

    it('validates empty content', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿内容は必須です');
    });

    it('validates content length', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'a'.repeat(201) }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿は200文字以内にしてください');
    });

    it('handles database errors on create', async () => {
      const Post = require('@/models/Post').default;
      Post.create.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({ content: 'Test post' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Database error');
    });
  });
});
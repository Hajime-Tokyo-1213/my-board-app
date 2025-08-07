/**
 * @jest-environment node
 */

import { GET, PUT, DELETE } from '@/app/api/posts/[id]/route';
import { NextRequest } from 'next/server';

// Mock dbConnect
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

// Mock Post model
const mockPost = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

jest.mock('@/models/Post', () => ({
  __esModule: true,
  default: mockPost,
}));

describe('API Routes - /api/posts/[id]', () => {
  const mockParams = { id: '507f1f77bcf86cd799439011' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/posts/[id]', () => {
    it('returns a single post by id', async () => {
      const mockPostData = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Test post content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPost.findById.mockResolvedValueOnce(mockPostData);

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPostData);
    });

    it('returns 404 when post not found', async () => {
      mockPost.findById.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Post not found');
    });

    it('handles errors', async () => {
      mockPost.findById.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch post');
    });
  });

  describe('PUT /api/posts/[id]', () => {
    it('updates a post successfully', async () => {
      const updatedPost = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Updated content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPost.findByIdAndUpdate.mockResolvedValueOnce(updatedPost);

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.content).toBe('Updated content');
    });

    it('validates empty content', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: '' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿内容は必須です');
    });

    it('validates content length', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'a'.repeat(201) }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('投稿は200文字以内にしてください');
    });

    it('returns 404 when post not found', async () => {
      mockPost.findByIdAndUpdate.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Post not found');
    });
  });

  describe('DELETE /api/posts/[id]', () => {
    it('deletes a post successfully', async () => {
      mockPost.findByIdAndDelete.mockResolvedValueOnce({ _id: mockParams.id });

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({});
    });

    it('returns 404 when post not found', async () => {
      mockPost.findByIdAndDelete.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Post not found');
    });

    it('handles errors', async () => {
      mockPost.findByIdAndDelete.mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to delete post');
    });
  });
});
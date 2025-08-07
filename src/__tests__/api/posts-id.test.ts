import { GET, PUT, DELETE } from '../../../app/api/posts/[id]/route';
import { createMockNextRequest } from '../helpers/next-mocks';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';

// Mock the dependencies
jest.mock('@/lib/mongodb');
jest.mock('@/models/Post');
jest.mock('mongoose');

describe('/api/posts/[id]', () => {
  const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;
  const mockPost = Post as jest.Mocked<typeof Post>;

  const mockParams = { id: '507f1f77bcf86cd799439011' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined as any);
  });

  describe('GET /api/posts/[id]', () => {
    it('returns a single post by id', async () => {
      const mockPostData = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Test post content',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPost.findById.mockResolvedValue(mockPostData as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(data).toEqual({
        success: true,
        data: mockPostData,
      });
      expect(response.status).toBe(200);
    });

    it('returns 404 when post is not found', async () => {
      mockPost.findById.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Post not found',
      });
      expect(response.status).toBe(404);
    });

    it('handles invalid ObjectId format', async () => {
      mockPost.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));

      const request = createMockNextRequest('http://localhost:3000/api/posts/invalid-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Failed to fetch post',
      });
      expect(response.status).toBe(500);
    });

    it('handles database connection errors', async () => {
      mockDbConnect.mockRejectedValue(new Error('Connection failed'));

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011');
      const response = await GET(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Failed to fetch post',
      });
      expect(response.status).toBe(500);
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

      mockPost.findByIdAndUpdate.mockResolvedValue(updatedPost as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.findByIdAndUpdate).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        { content: 'Updated content' },
        { new: true, runValidators: true }
      );
      expect(data).toEqual({
        success: true,
        data: updatedPost,
      });
      expect(response.status).toBe(200);
    });

    it('returns 404 when updating non-existent post', async () => {
      mockPost.findByIdAndUpdate.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Post not found',
      });
      expect(response.status).toBe(404);
    });

    it('validates empty content', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: '' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: '投稿内容は必須です',
      });
      expect(response.status).toBe(400);
      expect(mockPost.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('validates content length exceeding 200 characters', async () => {
      const longContent = 'a'.repeat(201);
      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: longContent }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: '投稿は200文字以内にしてください',
      });
      expect(response.status).toBe(400);
      expect(mockPost.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('handles validation errors from mongoose', async () => {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      mockPost.findByIdAndUpdate.mockRejectedValue(validationError);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Valid content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Failed to update post',
      });
      expect(response.status).toBe(500);
    });

    it('preserves other fields when updating', async () => {
      const existingPost = {
        _id: '507f1f77bcf86cd799439011',
        content: 'Original content',
        author: 'John Doe',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      };

      const updatedPost = {
        ...existingPost,
        content: 'Updated content',
        updatedAt: new Date(),
      };

      mockPost.findByIdAndUpdate.mockResolvedValue(updatedPost as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Updated content' }),
      });

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data.data.author).toBe('John Doe');
      expect(data.data.createdAt).toBe(existingPost.createdAt);
    });
  });

  describe('DELETE /api/posts/[id]', () => {
    it('deletes a post successfully', async () => {
      const deletedPost = {
        _id: '507f1f77bcf86cd799439011',
        content: 'To be deleted',
      };

      mockPost.findByIdAndDelete.mockResolvedValue(deletedPost as any);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(mockDbConnect).toHaveBeenCalled();
      expect(mockPost.findByIdAndDelete).toHaveBeenCalledWith('507f1f77bcf86cd799439011');
      expect(data).toEqual({
        success: true,
        data: {},
      });
      expect(response.status).toBe(200);
    });

    it('returns 404 when deleting non-existent post', async () => {
      mockPost.findByIdAndDelete.mockResolvedValue(null);

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Post not found',
      });
      expect(response.status).toBe(404);
    });

    it('handles database errors during deletion', async () => {
      mockPost.findByIdAndDelete.mockRejectedValue(new Error('Database error'));

      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Failed to delete post',
      });
      expect(response.status).toBe(500);
    });

    it('handles invalid ObjectId format during deletion', async () => {
      mockPost.findByIdAndDelete.mockRejectedValue(new Error('Cast to ObjectId failed'));

      const request = createMockNextRequest('http://localhost:3000/api/posts/invalid-id', {
        method: 'DELETE',
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: 'invalid-id' }) });
      const data = await response.json();

      expect(data).toEqual({
        success: false,
        error: 'Failed to delete post',
      });
      expect(response.status).toBe(500);
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles malformed JSON in PUT request', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: 'invalid json',
      });

      request.json = jest.fn().mockRejectedValue(new Error('Invalid JSON'));

      const response = await PUT(request, { params: Promise.resolve(mockParams) });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(response.status).toBe(500);
    });

    it('handles concurrent update attempts', async () => {
      const request1 = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Update 1' }),
      });

      const request2 = createMockNextRequest('http://localhost:3000/api/posts/507f1f77bcf86cd799439011', {
        method: 'PUT',
        body: JSON.stringify({ content: 'Update 2' }),
      });

      mockPost.findByIdAndUpdate
        .mockResolvedValueOnce({ _id: mockParams.id, content: 'Update 1' } as any)
        .mockResolvedValueOnce({ _id: mockParams.id, content: 'Update 2' } as any);

      const [response1, response2] = await Promise.all([
        PUT(request1, { params: Promise.resolve(mockParams) }),
        PUT(request2, { params: Promise.resolve(mockParams) }),
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(mockPost.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
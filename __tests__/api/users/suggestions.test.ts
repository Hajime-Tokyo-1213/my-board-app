import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/users/suggestions/route';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// モックの設定
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;

describe('/api/users/suggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDbConnect.mockResolvedValue(undefined as any);
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/suggestions?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return history suggestions for empty query', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/users/suggestions?includeHistory=true');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toBeDefined();
    });

    it('should return user suggestions for query', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: '田中太郎',
          username: 'tanaka',
          displayName: 'たなか太郎',
          profileImage: 'image1.jpg',
          followersCount: 100
        },
        {
          _id: '2',
          name: '田村花子',
          username: 'tamura',
          displayName: 'たむら花子',
          profileImage: 'image2.jpg',
          followersCount: 50
        }
      ];

      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const request = new NextRequest('http://localhost/api/users/suggestions?q=田');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toBeDefined();
      expect(data.suggestions.some((s: any) => s.type === 'user')).toBe(true);
      expect(data.suggestions.some((s: any) => s.value === 'たなか太郎')).toBe(true);
    });

    it('should handle Japanese text normalization in suggestions', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'サトウ',
          username: 'sato',
          displayName: 'さとう',
          profileImage: 'image.jpg',
          followersCount: 10
        }
      ];

      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      // ひらがなで検索
      const request1 = new NextRequest('http://localhost/api/users/suggestions?q=さとう');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(User.find).toHaveBeenCalled();

      // カタカナで検索
      const request2 = new NextRequest('http://localhost/api/users/suggestions?q=サトウ');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(User.find).toHaveBeenCalled();
    });

    it('should include query suggestions', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([])
        })
      });

      const request = new NextRequest('http://localhost/api/users/suggestions?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions.some((s: any) => s.type === 'query')).toBe(true);
      expect(data.suggestions.some((s: any) => s.value === 'testさん')).toBe(true);
      expect(data.suggestions.some((s: any) => s.value === '@test')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = Array.from({ length: 10 }, (_, i) => ({
        _id: `${i}`,
        name: `User${i}`,
        username: `user${i}`,
        displayName: `User ${i}`,
        profileImage: `image${i}.jpg`,
        followersCount: i * 10
      }));

      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers.slice(0, 3))
        })
      });

      const request = new NextRequest('http://localhost/api/users/suggestions?q=user&limit=3');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should remove duplicate suggestions', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'TestUser',
          username: 'test',
          displayName: 'TestUser',
          profileImage: 'image.jpg',
          followersCount: 10
        }
      ];

      User.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const request = new NextRequest('http://localhost/api/users/suggestions?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 重複する値がないことを確認
      const values = data.suggestions.map((s: any) => `${s.type}:${s.value}`);
      const uniqueValues = [...new Set(values)];
      expect(values.length).toBe(uniqueValues.length);
    });

    it('should handle errors gracefully', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/users/suggestions?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to generate suggestions');
    });
  });

  describe('POST', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/suggestions', {
        method: 'POST',
        body: JSON.stringify({ query: 'test' })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should save search history', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = {
        json: jest.fn().mockResolvedValue({ query: 'test search' })
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for empty query', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = {
        json: jest.fn().mockResolvedValue({ query: '' })
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Query is required');
    });

    it('should handle errors when saving history', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = {
        json: jest.fn().mockRejectedValue(new Error('Parse error'))
      } as unknown as NextRequest;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to save search history');
    });
  });

  describe('DELETE', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/suggestions', {
        method: 'DELETE'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should clear search history', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/users/suggestions', {
        method: 'DELETE'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle errors when clearing history', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      // セッションユーザーIDアクセス時にエラーを発生させる
      mockedGetServerSession.mockResolvedValue({
        user: {
          get id() {
            throw new Error('Session error');
          },
          email: 'user@example.com'
        }
      } as any);

      const request = new NextRequest('http://localhost/api/users/suggestions', {
        method: 'DELETE'
      });
      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to clear search history');
    });
  });
});
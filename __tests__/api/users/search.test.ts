import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/search/route';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// モックの設定
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;

describe('/api/users/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDbConnect.mockResolvedValue(undefined as any);
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return empty results for empty query', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const request = new NextRequest('http://localhost/api/users/search');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toEqual([]);
      expect(data.totalCount).toBe(0);
      expect(data.suggestions).toEqual([]);
      expect(data.relatedTags).toEqual([]);
    });

    it('should search users with Japanese text', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: '田中太郎',
          username: 'tanaka',
          displayName: 'たなか太郎',
          email: 'tanaka@example.com',
          bio: 'こんにちは',
          followersCount: 10,
          followingCount: 5,
          postsCount: 20,
          searchableText: '田中太郎 tanaka たなか太郎',
          toObject: function() { return this; }
        },
        {
          _id: '2',
          name: '佐藤花子',
          username: 'sato',
          displayName: 'さとう花子',
          email: 'sato@example.com',
          bio: 'よろしく',
          followersCount: 15,
          followingCount: 8,
          postsCount: 30,
          searchableText: '佐藤花子 sato さとう花子',
          toObject: function() { return this; }
        }
      ];

      const mockCurrentUser = {
        _id: 'user1',
        following: ['2']
      };

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);

      const request = new NextRequest('http://localhost/api/users/search?q=田中');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].name).toBe('田中太郎');
      expect(data.users[1].isFollowing).toBe(true);
    });

    it('should search with hiragana and katakana variations', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'タナカ',
          searchableText: 'タナカ たなか',
          toObject: function() { return this; }
        }
      ];

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      // ひらがなで検索
      const request1 = new NextRequest('http://localhost/api/users/search?q=たなか');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(User.find).toHaveBeenCalled();

      // カタカナで検索
      const request2 = new NextRequest('http://localhost/api/users/search?q=タナカ');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(User.find).toHaveBeenCalled();
    });

    it('should search by different types', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([])
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      // 名前で検索
      const request1 = new NextRequest('http://localhost/api/users/search?q=test&type=name');
      await GET(request1);

      // ユーザー名で検索
      const request2 = new NextRequest('http://localhost/api/users/search?q=test&type=username');
      await GET(request2);

      // 自己紹介で検索
      const request3 = new NextRequest('http://localhost/api/users/search?q=test&type=bio');
      await GET(request3);

      expect(User.find).toHaveBeenCalledTimes(3);
    });

    it('should sort results by different criteria', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'User1',
          followersCount: 10,
          lastActiveAt: new Date('2024-01-01'),
          searchableText: 'user1',
          toObject: function() { return this; }
        },
        {
          _id: '2',
          name: 'User2',
          followersCount: 20,
          lastActiveAt: new Date('2024-01-02'),
          searchableText: 'user2',
          toObject: function() { return this; }
        }
      ];

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      // 人気順でソート
      const request1 = new NextRequest('http://localhost/api/users/search?q=user&sort=popularity');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.users[0].followersCount).toBe(20);

      // 最新順でソート
      const request2 = new NextRequest('http://localhost/api/users/search?q=user&sort=recent');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
    });

    it('should handle pagination', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = Array.from({ length: 30 }, (_, i) => ({
        _id: `${i}`,
        name: `User${i}`,
        searchableText: `user${i}`,
        toObject: function() { return this; }
      }));

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      const request = new NextRequest('http://localhost/api/users/search?q=user&limit=10&offset=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(10);
    });

    it('should generate suggestions from search results', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'TestUser',
          username: 'testuser',
          displayName: 'Test User',
          searchableText: 'testuser',
          toObject: function() { return this; }
        }
      ];

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      const request = new NextRequest('http://localhost/api/users/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.suggestions).toContain('TestUser');
      expect(data.suggestions).toContain('testuser');
    });

    it('should extract related tags from users', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockUsers = [
        {
          _id: '1',
          name: 'User1',
          tags: ['developer', 'javascript'],
          searchableText: 'user1',
          toObject: function() { return this; }
        },
        {
          _id: '2',
          name: 'User2',
          tags: ['developer', 'python'],
          searchableText: 'user2',
          toObject: function() { return this; }
        }
      ];

      User.find = jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue(mockUsers)
      });

      User.findById = jest.fn().mockResolvedValue({ _id: 'user1', following: [] });

      const request = new NextRequest('http://localhost/api/users/search?q=user');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.relatedTags).toContain('developer');
      expect(data.relatedTags).toContain('javascript');
      expect(data.relatedTags).toContain('python');
    });

    it('should handle errors gracefully', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.find = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost/api/users/search?q=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to search users');
    });
  });
});
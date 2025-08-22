import { NextRequest } from 'next/server';
import { GET } from '@/app/api/users/recommended/route';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Post from '@/models/Post';

// モックの設定
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('@/models/Post');

const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockedDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;

describe('/api/users/recommended', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDbConnect.mockResolvedValue(undefined as any);
  });

  describe('GET', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/recommended');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 404 if current user not found', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.findById = jest.fn().mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/users/recommended');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });

    it('should get similar users based on tags and language', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: ['user2'],
        followers: ['user3', 'user4'],
        tags: ['developer', 'javascript'],
        language: ['ja', 'en']
      };

      const mockSimilarUsers = [
        {
          _id: 'user5',
          name: '似ているユーザー1',
          username: 'similar1',
          tags: ['developer', 'javascript'],
          language: ['ja'],
          followersCount: 50,
          followingCount: 30,
          postsCount: 100,
          followers: ['user3'],
          following: ['user2'],
          toObject: function() { return this; }
        },
        {
          _id: 'user6',
          name: '似ているユーザー2',
          username: 'similar2',
          tags: ['developer'],
          language: ['en'],
          followersCount: 40,
          followingCount: 20,
          postsCount: 80,
          followers: [],
          following: [],
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockSimilarUsers)
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?type=similar');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.users.length).toBeGreaterThan(0);
      expect(data.users[0].reason).toBe('共通の興味・関心があります');
    });

    it('should get popular users', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: []
      };

      const mockPopularUsers = [
        {
          _id: 'user2',
          name: '人気ユーザー1',
          username: 'popular1',
          followersCount: 1000,
          followingCount: 100,
          postsCount: 500,
          toObject: function() { return this; }
        },
        {
          _id: 'user3',
          name: '人気ユーザー2',
          username: 'popular2',
          followersCount: 800,
          followingCount: 150,
          postsCount: 400,
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockPopularUsers)
          })
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?type=popular');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.users[0].reason).toBe('人気のユーザーです');
      expect(data.users[0].user.followersCount).toBe(1000);
    });

    it('should get active users', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: []
      };

      const mockActiveUsers = [
        {
          _id: 'user2',
          name: 'アクティブユーザー1',
          username: 'active1',
          lastActiveAt: new Date(),
          followersCount: 50,
          followingCount: 40,
          postsCount: 200,
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockActiveUsers)
          })
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?type=active');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.users[0].reason).toBe('アクティブに活動中です');
    });

    it('should get new users', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: []
      };

      const mockNewUsers = [
        {
          _id: 'user2',
          name: '新規ユーザー1',
          username: 'new1',
          createdAt: new Date(),
          followersCount: 5,
          followingCount: 10,
          postsCount: 3,
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockNewUsers)
          })
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?type=new');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.users[0].reason).toBe('新規登録ユーザーです');
    });

    it('should get followers of following users', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: ['user2', 'user3']
      };

      const mockFollowingUsers = [
        {
          _id: 'user2',
          following: ['user4', 'user5']
        },
        {
          _id: 'user3',
          following: ['user4', 'user6']
        }
      ];

      const mockRecommendedUsers = [
        {
          _id: 'user4',
          name: 'おすすめユーザー1',
          username: 'recommend1',
          followersCount: 100,
          followingCount: 50,
          postsCount: 200,
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn()
        .mockResolvedValueOnce(mockFollowingUsers)
        .mockReturnValueOnce({
          select: jest.fn().mockResolvedValue(mockRecommendedUsers)
        });

      const request = new NextRequest('http://localhost/api/users/recommended?type=followersOfFollowing');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toBeDefined();
      expect(data.users[0].reason).toBe('フォロー中のユーザーがフォローしています');
    });

    it('should exclude following users when specified', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: ['user2', 'user3']
      };

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([])
          })
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?excludeFollowing=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(User.find).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: expect.objectContaining({
            $ne: 'user1',
            $nin: ['user2', 'user3']
          })
        })
      );
    });

    it('should calculate recommendation scores correctly', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: [],
        tags: ['developer', 'javascript'],
        language: ['ja']
      };

      const mockUsers = [
        {
          _id: 'user2',
          name: 'ユーザー1',
          username: 'user1',
          bio: '自己紹介あり',
          profileImage: 'image.jpg',
          displayName: '表示名',
          followersCount: 100,
          followingCount: 50,
          postsCount: 200,
          lastActiveAt: new Date(),
          tags: ['developer', 'javascript'],
          language: ['ja'],
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users[0].score).toBeGreaterThan(0);
      expect(data.users[0].score).toBeLessThanOrEqual(100);
    });

    it('should handle mixed recommendation types', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: [],
        tags: [],
        language: []
      };

      const mockUsers = [
        {
          _id: 'user2',
          name: 'ユーザー2',
          followersCount: 100,
          toObject: function() { return this; }
        }
      ];

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(mockUsers)
        })
      });

      // デフォルトタイプ（複合）のリクエスト
      const request = new NextRequest('http://localhost/api/users/recommended');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(User.find).toHaveBeenCalledTimes(3); // similar, popular, active
    });

    it('should handle errors gracefully', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/users/recommended');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to get recommended users');
    });

    it('should respect limit parameter', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user1', email: 'user@example.com' }
      } as any);

      const mockCurrentUser = {
        _id: 'user1',
        following: []
      };

      const mockUsers = Array.from({ length: 20 }, (_, i) => ({
        _id: `user${i}`,
        name: `ユーザー${i}`,
        followersCount: i * 10,
        toObject: function() { return this; }
      }));

      User.findById = jest.fn().mockResolvedValue(mockCurrentUser);
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue(mockUsers)
          })
        })
      });

      const request = new NextRequest('http://localhost/api/users/recommended?limit=5');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users.length).toBeLessThanOrEqual(5);
    });
  });
});
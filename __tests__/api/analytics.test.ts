import { GET } from '@/app/api/analytics/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import Analytics from '@/models/Analytics';
import Post from '@/models/Post';
import Follow from '@/models/Follow';
import User from '@/models/User';
import Comment from '@/models/Comment';
import dbConnect from '@/lib/mongodb';

// モック
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/Analytics');
jest.mock('@/models/Post');
jest.mock('@/models/Follow');
jest.mock('@/models/User');
jest.mock('@/models/Comment');

describe('/api/analytics', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      id: '507f1f77bcf86cd799439011'
    }
  };

  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    username: 'testuser'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (dbConnect as jest.Mock).mockResolvedValue(undefined);
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('基本統計の取得', () => {
    it('統計データを正常に返すこと', async () => {
      // モックデータ設定
      (Follow.countDocuments as jest.Mock)
        .mockResolvedValueOnce(150) // followers
        .mockResolvedValueOnce(75); // following
      
      const mockPosts = Array(25).fill(null).map((_, i) => ({
        _id: `post${i}`,
        likes: Array(Math.floor(Math.random() * 10)),
        createdAt: new Date()
      }));
      
      (Post.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockPosts)
      });
      
      (Comment.countDocuments as jest.Mock).mockResolvedValue(45);
      
      (Analytics.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          metrics: {
            followers: 140,
            totalPosts: 20,
            engagementRate: 3.5
          }
        })
      });

      (Analytics.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      // リクエスト実行
      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats');
      const response = await GET(request);
      const data = await response.json();

      // アサーション
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('followers', 150);
      expect(data).toHaveProperty('following', 75);
      expect(data).toHaveProperty('totalPosts', 25);
      expect(data).toHaveProperty('totalLikes');
      expect(data).toHaveProperty('engagementRate');
      expect(data).toHaveProperty('periodComparison');
      expect(data.periodComparison).toHaveProperty('followersChange');
    });

    it('認証なしの場合401を返すこと', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats');
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    it('ユーザーが見つからない場合404を返すこと', async () => {
      (User.findOne as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats');
      const response = await GET(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'User not found');
    });
  });

  describe('成長データの取得', () => {
    it('指定期間の成長データを返すこと', async () => {
      const mockAnalyticsData = Array(7).fill(null).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date,
          metrics: {
            followers: 100 + i * 5,
            totalPosts: 20 + i,
            engagementRate: 3.5 + i * 0.2,
            totalLikes: 50 + i * 10
          }
        };
      });

      (Analytics.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockAnalyticsData)
        })
      });

      const request = new NextRequest('http://localhost:3000/api/analytics?type=growth&period=7');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(7);
      expect(data.data[0]).toHaveProperty('date');
      expect(data.data[0]).toHaveProperty('followers');
      expect(data.data[0]).toHaveProperty('posts');
      expect(data.data[0]).toHaveProperty('engagement');
      expect(data.data[0]).toHaveProperty('likes');
    });

    it('データがない場合、現在のデータを返すこと', async () => {
      (Analytics.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      // getBasicStatsのモック
      (Follow.countDocuments as jest.Mock)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(75);
      
      (Post.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });
      
      (Comment.countDocuments as jest.Mock).mockResolvedValue(0);
      (Analytics.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue(null)
      });
      (Analytics.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/analytics?type=growth&period=30');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });
  });

  describe('人気投稿の取得', () => {
    it('人気投稿ランキングを返すこと', async () => {
      const mockPosts = Array(10).fill(null).map((_, i) => ({
        _id: `post${i}`,
        content: `Test post content ${i} with some longer text for testing purposes`,
        likes: Array(10 - i),
        images: [`image${i}.jpg`],
        author: {
          username: 'testuser',
          profileImage: 'profile.jpg'
        },
        createdAt: new Date()
      }));

      (Post.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockPosts)
            })
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/analytics?type=popular-posts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('posts');
      expect(Array.isArray(data.posts)).toBe(true);
      expect(data.posts).toHaveLength(10);
      expect(data.posts[0]).toHaveProperty('id');
      expect(data.posts[0]).toHaveProperty('title');
      expect(data.posts[0]).toHaveProperty('content');
      expect(data.posts[0]).toHaveProperty('likes', 10);
      expect(data.posts[0]).toHaveProperty('engagementScore');
    });
  });

  describe('最適投稿時間の分析', () => {
    it('時間帯別アクティビティを返すこと', async () => {
      const mockPosts = Array(50).fill(null).map((_, i) => {
        const date = new Date();
        date.setHours(Math.floor(Math.random() * 24));
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));
        return {
          createdAt: date,
          likes: Array(Math.floor(Math.random() * 20))
        };
      });

      (Post.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockPosts)
      });

      const request = new NextRequest('http://localhost:3000/api/analytics?type=best-times');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('heatmap');
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.heatmap)).toBe(true);
      expect(data.heatmap.length).toBeGreaterThan(0);
      expect(data.heatmap[0]).toHaveProperty('day');
      expect(data.heatmap[0]).toHaveProperty('hour');
      expect(data.heatmap[0]).toHaveProperty('activity');
      expect(Array.isArray(data.recommendations)).toBe(true);
    });
  });

  describe('インサイトの生成', () => {
    it('分析に基づくインサイトを返すこと', async () => {
      // 各APIのモックを設定
      (Follow.countDocuments as jest.Mock)
        .mockResolvedValue(150);
      
      (Post.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue([])
            })
          })
        })
      });
      
      (Comment.countDocuments as jest.Mock).mockResolvedValue(0);
      
      (Analytics.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          metrics: {
            followers: 100,
            totalPosts: 10,
            engagementRate: 6
          }
        })
      });

      (Analytics.find as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      });

      (Analytics.findOneAndUpdate as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/analytics?type=insights');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('insights');
      expect(Array.isArray(data.insights)).toBe(true);
      
      if (data.insights.length > 0) {
        expect(data.insights[0]).toHaveProperty('type');
        expect(data.insights[0]).toHaveProperty('message');
        expect(['success', 'warning', 'info']).toContain(data.insights[0].type);
      }
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なtypeパラメータの場合400を返すこと', async () => {
      const request = new NextRequest('http://localhost:3000/api/analytics?type=invalid');
      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Invalid type parameter');
    });

    it('データベースエラーの場合500を返すこと', async () => {
      (dbConnect as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/analytics?type=stats');
      const response = await GET(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error', 'Internal server error');
    });
  });
});
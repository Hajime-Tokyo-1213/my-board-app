import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/mentions/notify/route';
import { GET as searchUsers } from '@/app/api/users/search/mention/route';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Mention from '@/models/Mention';
import Notification from '@/models/Notification';
import Post from '@/models/Post';
import Comment from '@/models/Comment';
import { sendNotificationToUser } from '@/lib/notifications';

// モック
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/User');
jest.mock('@/models/Mention');
jest.mock('@/models/Notification');
jest.mock('@/models/Post');
jest.mock('@/models/Comment');
jest.mock('@/lib/notifications');

describe('Mentions API', () => {
  const mockSession = {
    user: {
      email: 'test@example.com',
      name: 'Test User',
      image: '/avatar.jpg',
    },
  };

  const mockCurrentUser = {
    _id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    profileImage: '/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (connectDB as jest.Mock).mockResolvedValue(undefined);
    (User.findOne as jest.Mock).mockResolvedValue(mockCurrentUser);
  });

  describe('POST /api/mentions/notify', () => {
    it('メンション通知を作成', async () => {
      const mockPost = { _id: 'post123' };
      const mockMentions = [
        {
          _id: 'mention1',
          mentionedUser: 'user456',
          content: 'Hello @user',
          position: { start: 6, end: 11 },
          notificationSent: false,
          save: jest.fn(),
        },
      ];

      (Post.findById as jest.Mock).mockResolvedValue(mockPost);
      (Mention.createMentions as jest.Mock).mockResolvedValue(mockMentions);
      (Notification.prototype.save as jest.Mock).mockResolvedValue({
        _id: 'notif1',
        recipient: 'user456',
        type: 'mention',
        message: 'Test Userさんがあなたをメンションしました',
      });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: 'user456',
        name: 'Mentioned User',
      });
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
      (sendNotificationToUser as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify', {
        method: 'POST',
        body: JSON.stringify({
          postId: 'post123',
          mentionedUsers: ['user456'],
          content: 'Hello @user',
          positions: [
            {
              userId: 'user456',
              username: 'user',
              position: { start: 6, end: 11 },
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.mentions).toHaveLength(1);
      expect(data.notifications).toHaveLength(1);
      expect(Mention.createMentions).toHaveBeenCalledWith(
        'post',
        'post123',
        'user123',
        expect.any(Array),
        'Hello @user'
      );
      expect(sendNotificationToUser).toHaveBeenCalled();
    });

    it('コメントのメンション通知を作成', async () => {
      const mockComment = { _id: 'comment123' };
      const mockMentions = [
        {
          _id: 'mention1',
          mentionedUser: 'user456',
          content: 'Reply to @user',
          position: { start: 9, end: 14 },
          notificationSent: false,
          save: jest.fn(),
        },
      ];

      (Comment.findById as jest.Mock).mockResolvedValue(mockComment);
      (Mention.createMentions as jest.Mock).mockResolvedValue(mockMentions);
      (Notification.prototype.save as jest.Mock).mockResolvedValue({
        _id: 'notif1',
        recipient: 'user456',
        type: 'mention',
      });
      (User.findById as jest.Mock).mockResolvedValue({
        _id: 'user456',
        name: 'Mentioned User',
      });
      (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const request = new NextRequest('http://localhost:3000/api/mentions/notify', {
        method: 'POST',
        body: JSON.stringify({
          commentId: 'comment123',
          mentionedUsers: ['user456'],
          content: 'Reply to @user',
          positions: [
            {
              userId: 'user456',
              username: 'user',
              position: { start: 9, end: 14 },
            },
          ],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(Mention.createMentions).toHaveBeenCalledWith(
        'comment',
        'comment123',
        'user123',
        expect.any(Array),
        'Reply to @user'
      );
    });

    it('最大メンション数を検証', async () => {
      const mentionedUsers = Array.from({ length: 11 }, (_, i) => `user${i}`);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify', {
        method: 'POST',
        body: JSON.stringify({
          postId: 'post123',
          mentionedUsers,
          content: 'Too many mentions',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Maximum 10 mentions');
    });

    it('認証されていない場合エラー', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify', {
        method: 'POST',
        body: JSON.stringify({
          postId: 'post123',
          mentionedUsers: ['user456'],
          content: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('投稿が存在しない場合エラー', async () => {
      (Post.findById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify', {
        method: 'POST',
        body: JSON.stringify({
          postId: 'nonexistent',
          mentionedUsers: ['user456'],
          content: 'Hello',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Post not found');
    });
  });

  describe('GET /api/mentions/notify', () => {
    it('受信したメンション一覧を取得', async () => {
      const mockMentions = [
        {
          _id: 'mention1',
          mentionedUser: 'user123',
          mentionedBy: {
            _id: 'user456',
            username: 'sender',
            name: 'Sender User',
          },
          content: 'Hello @you',
          read: false,
          createdAt: new Date(),
        },
      ];

      (Mention.getUserMentions as jest.Mock).mockResolvedValue(mockMentions);
      (Mention.countDocuments as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify?type=received');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mentions).toHaveLength(1);
      expect(data.pagination.total).toBe(1);
      expect(Mention.getUserMentions).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ type: 'received' })
      );
    });

    it('送信したメンション一覧を取得', async () => {
      const mockMentions = [
        {
          _id: 'mention1',
          mentionedBy: 'user123',
          mentionedUser: {
            _id: 'user456',
            username: 'recipient',
            name: 'Recipient User',
          },
          content: 'Hello @recipient',
          read: true,
          createdAt: new Date(),
        },
      ];

      (Mention.getUserMentions as jest.Mock).mockResolvedValue(mockMentions);
      (Mention.countDocuments as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify?type=sent');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.mentions).toHaveLength(1);
      expect(Mention.getUserMentions).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ type: 'sent' })
      );
    });

    it('ページネーションを適用', async () => {
      (Mention.getUserMentions as jest.Mock).mockResolvedValue([]);
      (Mention.countDocuments as jest.Mock).mockResolvedValue(100);

      const request = new NextRequest('http://localhost:3000/api/mentions/notify?page=2&limit=20');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(data.pagination.limit).toBe(20);
      expect(data.pagination.hasMore).toBe(true);
      expect(Mention.getUserMentions).toHaveBeenCalledWith(
        'user123',
        expect.objectContaining({ skip: 20, limit: 20 })
      );
    });
  });

  describe('GET /api/users/search/mention', () => {
    it('ユーザーを検索', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          username: 'testuser',
          name: 'Test User',
          profileImage: '/avatar1.jpg',
          isVerified: true,
        },
        {
          _id: 'user2',
          username: 'testuser2',
          name: 'Test User 2',
          profileImage: '/avatar2.jpg',
          isVerified: false,
        },
      ];

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const request = new NextRequest('http://localhost:3000/api/users/search/mention?query=test');

      const response = await searchUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.users[0].username).toBe('testuser');
    });

    it('日本語で検索', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          username: 'tanaka',
          name: '田中太郎',
          profileImage: '/avatar1.jpg',
          isVerified: false,
        },
      ];

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const request = new NextRequest('http://localhost:3000/api/users/search/mention?query=田中');

      const response = await searchUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('田中太郎');
    });

    it('結果をスコアリング', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          username: 'test',
          name: 'Another User',
          isVerified: false,
        },
        {
          _id: 'user2',
          username: 'testuser',
          name: 'Test',
          isVerified: true,
        },
        {
          _id: 'user3',
          username: 'usertest',
          name: 'Testing User',
          isVerified: false,
        },
      ];

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const request = new NextRequest('http://localhost:3000/api/users/search/mention?query=test');

      const response = await searchUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // 完全一致が最初に来るはず
      expect(data.users[0].username).toBe('test');
    });

    it('空のクエリの場合空の結果', async () => {
      const request = new NextRequest('http://localhost:3000/api/users/search/mention?query=');

      const response = await searchUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(0);
    });

    it('制限数を適用', async () => {
      const mockUsers = Array.from({ length: 5 }, (_, i) => ({
        _id: `user${i}`,
        username: `user${i}`,
        name: `User ${i}`,
      }));

      (User.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockUsers),
      });

      const request = new NextRequest('http://localhost:3000/api/users/search/mention?query=user&limit=3');

      const response = await searchUsers(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(3);
    });
  });
});
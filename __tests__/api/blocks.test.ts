import { createMocks } from 'node-mocks-http';
import { GET, POST, DELETE } from '@/app/api/blocks/route';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import BlockedRelation from '@/models/BlockedRelation';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.mock('next-auth');
jest.mock('@/lib/mongodb');

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(() => {
  (dbConnect as jest.Mock).mockResolvedValue(true);
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.deleteMany({});
  await BlockedRelation.deleteMany({});
});

describe('/api/blocks', () => {
  const mockSession = {
    user: {
      email: 'user@example.com',
      name: 'Test User',
      id: 'user123',
    },
  };

  describe('GET /api/blocks', () => {
    it('should return blocked users list', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const blockedUser = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'blocked@example.com',
        password: 'password123',
        name: 'Blocked User',
      });

      await BlockedRelation.create({
        blocker: currentUser._id,
        blocked: blockedUser._id,
        reason: 'Test reason',
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/blocks?page=1&limit=10',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Blocked User');
      expect(data.total).toBe(1);
    });

    it('should require authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    it('should handle pagination', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      // Create multiple blocked users
      for (let i = 0; i < 5; i++) {
        const blockedUser = await User.create({
          email: `blocked${i}@example.com`,
          password: 'password123',
          name: `Blocked User ${i}`,
        });

        await BlockedRelation.create({
          blocker: currentUser._id,
          blocked: blockedUser._id,
        });
      }

      const { req } = createMocks({
        method: 'GET',
        url: '/api/blocks?page=1&limit=2',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.users).toHaveLength(2);
      expect(data.total).toBe(5);
      expect(data.totalPages).toBe(3);
    });
  });

  describe('POST /api/blocks', () => {
    it('should block a user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const targetUser = await User.create({
        email: 'target@example.com',
        password: 'password123',
        name: 'Target User',
      });

      const { req } = createMocks({
        method: 'POST',
        body: {
          userId: targetUser._id.toString(),
          reason: 'Spam',
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ユーザーをブロックしました');
      expect(data.blockedUser.name).toBe('Target User');

      // Verify block relation was created
      const blockRelation = await BlockedRelation.findOne({
        blocker: currentUser._id,
        blocked: targetUser._id,
      });
      expect(blockRelation).toBeTruthy();
      expect(blockRelation?.reason).toBe('Spam');
    });

    it('should prevent duplicate blocks', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const targetUser = await User.create({
        email: 'target@example.com',
        password: 'password123',
        name: 'Target User',
      });

      // Create existing block
      await BlockedRelation.create({
        blocker: currentUser._id,
        blocked: targetUser._id,
      });

      const { req } = createMocks({
        method: 'POST',
        body: {
          userId: targetUser._id.toString(),
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('既にブロック');
    });

    it('should require userId', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { req } = createMocks({
        method: 'POST',
        body: {},
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ユーザーIDが必要です');
    });

    it('should handle non-existent target user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const { req } = createMocks({
        method: 'POST',
        body: {
          userId: new mongoose.Types.ObjectId().toString(),
        },
      });

      const response = await POST(req as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ブロック対象のユーザーが見つかりません');
    });
  });

  describe('DELETE /api/blocks', () => {
    it('should unblock a user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const blockedUser = await User.create({
        email: 'blocked@example.com',
        password: 'password123',
        name: 'Blocked User',
      });

      await BlockedRelation.create({
        blocker: currentUser._id,
        blocked: blockedUser._id,
      });

      const { req } = createMocks({
        method: 'DELETE',
        url: `/api/blocks?userId=${blockedUser._id}`,
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('ブロックを解除しました');

      // Verify block relation was deleted
      const blockRelation = await BlockedRelation.findOne({
        blocker: currentUser._id,
        blocked: blockedUser._id,
      });
      expect(blockRelation).toBeNull();
    });

    it('should require userId parameter', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const { req } = createMocks({
        method: 'DELETE',
        url: '/api/blocks',
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ユーザーIDが必要です');
    });

    it('should handle non-existent block relation', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const { req } = createMocks({
        method: 'DELETE',
        url: `/api/blocks?userId=${new mongoose.Types.ObjectId()}`,
      });

      const response = await DELETE(req as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('ブロック解除に失敗しました。ブロック関係が見つかりません');
    });
  });
});
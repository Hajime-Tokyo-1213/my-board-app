import { createMocks } from 'node-mocks-http';
import { GET } from '@/app/api/follow-requests/route';
import { POST as APPROVE_POST } from '@/app/api/follow-requests/[id]/approve/route';
import { POST as REJECT_POST } from '@/app/api/follow-requests/[id]/reject/route';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import FollowRequest from '@/models/FollowRequest';
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
  await FollowRequest.deleteMany({});
});

describe('/api/follow-requests', () => {
  const mockSession = {
    user: {
      email: 'user@example.com',
      name: 'Test User',
      id: 'user123',
    },
  };

  describe('GET /api/follow-requests', () => {
    it('should return pending follow requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const receiver = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
        privacySettings: {
          isPrivate: true,
          requireFollowApproval: true,
        },
      });

      const requester = await User.create({
        _id: new mongoose.Types.ObjectId(),
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'GET',
        url: '/api/follow-requests?page=1&limit=10',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
      expect(data.requests[0].requester.name).toBe('Requester');
      expect(data.requests[0].status).toBe('pending');
    });

    it('should only return requests for the current user', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const currentUser = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const otherUser = await User.create({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      // Create request for current user
      await FollowRequest.create({
        requester: requester._id,
        receiver: currentUser._id,
        status: 'pending',
      });

      // Create request for other user
      await FollowRequest.create({
        requester: requester._id,
        receiver: otherUser._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('should not return approved or rejected requests', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const receiver = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const requester1 = await User.create({
        email: 'requester1@example.com',
        password: 'password123',
        name: 'Requester 1',
      });

      const requester2 = await User.create({
        email: 'requester2@example.com',
        password: 'password123',
        name: 'Requester 2',
      });

      const requester3 = await User.create({
        email: 'requester3@example.com',
        password: 'password123',
        name: 'Requester 3',
      });

      await FollowRequest.create({
        requester: requester1._id,
        receiver: receiver._id,
        status: 'pending',
      });

      await FollowRequest.create({
        requester: requester2._id,
        receiver: receiver._id,
        status: 'approved',
      });

      await FollowRequest.create({
        requester: requester3._id,
        receiver: receiver._id,
        status: 'rejected',
      });

      const { req } = createMocks({
        method: 'GET',
      });

      const response = await GET(req as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.requests).toHaveLength(1);
      expect(data.requests[0].requester.name).toBe('Requester 1');
    });
  });

  describe('POST /api/follow-requests/:id/approve', () => {
    it('should approve a follow request', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const receiver = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
        followers: [],
        followersCount: 0,
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
        following: [],
        followingCount: 0,
      });

      const request = await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'POST',
        query: { id: request._id.toString() },
      });

      const response = await APPROVE_POST(req as any, { params: { id: request._id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('フォローリクエストを承認しました');

      // Verify request status
      const updatedRequest = await FollowRequest.findById(request._id);
      expect(updatedRequest?.status).toBe('approved');

      // Verify follow relationship
      const updatedReceiver = await User.findById(receiver._id);
      const updatedRequester = await User.findById(requester._id);
      
      expect(updatedReceiver?.followers).toContain(requester._id.toString());
      expect(updatedReceiver?.followersCount).toBe(1);
      expect(updatedRequester?.following).toContain(receiver._id.toString());
      expect(updatedRequester?.followingCount).toBe(1);
    });

    it('should only allow receiver to approve request', async () => {
      const otherSession = {
        user: {
          email: 'other@example.com',
          name: 'Other User',
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(otherSession);

      const receiver = await User.create({
        email: 'receiver@example.com',
        password: 'password123',
        name: 'Receiver',
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      await User.create({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
      });

      const request = await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'POST',
      });

      const response = await APPROVE_POST(req as any, { params: { id: request._id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このリクエストを承認する権限がありません');
    });

    it('should not approve already approved request', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const receiver = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      const request = await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'approved',
      });

      const { req } = createMocks({
        method: 'POST',
      });

      const response = await APPROVE_POST(req as any, { params: { id: request._id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('このリクエストは既に処理されています');
    });
  });

  describe('POST /api/follow-requests/:id/reject', () => {
    it('should reject a follow request', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const receiver = await User.create({
        email: 'user@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      const request = await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'POST',
      });

      const response = await REJECT_POST(req as any, { params: { id: request._id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('フォローリクエストを拒否しました');

      // Verify request status
      const updatedRequest = await FollowRequest.findById(request._id);
      expect(updatedRequest?.status).toBe('rejected');

      // Verify no follow relationship created
      const updatedReceiver = await User.findById(receiver._id);
      const updatedRequester = await User.findById(requester._id);
      
      expect(updatedReceiver?.followers).not.toContain(requester._id.toString());
      expect(updatedReceiver?.followersCount).toBe(0);
      expect(updatedRequester?.following).not.toContain(receiver._id.toString());
      expect(updatedRequester?.followingCount).toBe(0);
    });

    it('should only allow receiver to reject request', async () => {
      const otherSession = {
        user: {
          email: 'other@example.com',
          name: 'Other User',
        },
      };
      (getServerSession as jest.Mock).mockResolvedValue(otherSession);

      const receiver = await User.create({
        email: 'receiver@example.com',
        password: 'password123',
        name: 'Receiver',
      });

      const requester = await User.create({
        email: 'requester@example.com',
        password: 'password123',
        name: 'Requester',
      });

      await User.create({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
      });

      const request = await FollowRequest.create({
        requester: requester._id,
        receiver: receiver._id,
        status: 'pending',
      });

      const { req } = createMocks({
        method: 'POST',
      });

      const response = await REJECT_POST(req as any, { params: { id: request._id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('このリクエストを拒否する権限がありません');
    });
  });
});
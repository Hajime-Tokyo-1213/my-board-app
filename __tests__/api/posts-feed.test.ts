import { GET } from '@/app/api/posts/feed/route';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import User from '@/models/User';

// モック設定
jest.mock('next-auth');
jest.mock('@/lib/mongodb');
jest.mock('@/models/Post');
jest.mock('@/models/User');

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockDbConnect = dbConnect as jest.MockedFunction<typeof dbConnect>;

describe('POST /api/posts/feed', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDbConnect.mockResolvedValue(undefined as any);
  });

  it('認証されていない場合は401を返す', async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/posts/feed');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('認証が必要です');
  });

  it('カーソルなしで最初のページを取得する', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const mockPosts = [
      {
        _id: '1',
        userId: { _id: 'user1', name: 'User 1', image: 'avatar1.jpg' },
        content: 'Post 1',
        imageUrl: null,
        videoUrl: null,
        likeCount: 5,
        commentCount: 2,
        likes: [],
        hashtags: ['test'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        _id: '2',
        userId: { _id: 'user2', name: 'User 2', image: 'avatar2.jpg' },
        content: 'Post 2',
        imageUrl: 'image.jpg',
        videoUrl: null,
        likeCount: 10,
        commentCount: 3,
        likes: [],
        hashtags: [],
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
    ];

    const mockUser = {
      _id: 'currentUser',
      email: 'test@example.com',
      following: ['user1', 'user2'],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockPosts),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed?limit=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(2);
    expect(data.posts[0].userName).toBe('User 1');
    expect(data.hasMore).toBe(false);
    expect(data.nextCursor).toBe(null);
  });

  it('カーソル付きで次のページを取得する', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const cursorPost = {
      _id: 'cursor123',
      createdAt: new Date('2024-01-15'),
    };

    (Post.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(cursorPost),
    });

    const mockPosts = Array.from({ length: 21 }, (_, i) => ({
      _id: `post${i}`,
      userId: { _id: `user${i}`, name: `User ${i}`, image: null },
      content: `Post content ${i}`,
      imageUrl: null,
      videoUrl: null,
      likeCount: i,
      commentCount: i,
      likes: [],
      hashtags: [],
      createdAt: new Date(`2024-01-${i + 1}`),
      updatedAt: new Date(`2024-01-${i + 1}`),
    }));

    const mockUser = {
      _id: 'currentUser',
      email: 'test@example.com',
      following: ['user1'],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockPosts),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed?cursor=cursor123&limit=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.posts).toHaveLength(20);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe('post19');
  });

  it('ユーザーIDでフィルタリングする', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const mockPosts = [
      {
        _id: '1',
        userId: 'specificUser',
        content: 'User specific post',
        imageUrl: null,
        videoUrl: null,
        likeCount: 5,
        commentCount: 2,
        likes: [],
        hashtags: [],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockPosts),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed?userId=specificUser&limit=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Post.find).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'specificUser' })
    );
  });

  it('ハッシュタグでフィルタリングする', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const mockPosts = [
      {
        _id: '1',
        userId: { _id: 'user1', name: 'User 1', image: null },
        content: 'Post with hashtag',
        imageUrl: null,
        videoUrl: null,
        likeCount: 5,
        commentCount: 2,
        likes: [],
        hashtags: ['test'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    const mockUser = {
      _id: 'currentUser',
      email: 'test@example.com',
      following: [],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(mockPosts),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed?hashtag=test&limit=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Post.find).toHaveBeenCalledWith(
      expect.objectContaining({ hashtags: 'test' })
    );
  });

  it('フォローしているユーザーがいない場合は自分の投稿のみ取得', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const mockUser = {
      _id: 'currentUser',
      email: 'test@example.com',
      following: [],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Post.find).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'currentUser' })
    );
  });

  it('エラー時に500を返す', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    (User.findOne as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/posts/feed');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('フィードの取得に失敗しました');
  });

  it('limitパラメータが最大値を超えないようにする', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test User' },
      expires: '2024-12-31',
    } as any);

    const mockUser = {
      _id: 'currentUser',
      email: 'test@example.com',
      following: [],
    };

    (User.findOne as jest.Mock).mockResolvedValue(mockUser);
    
    const mockQuery = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };
    (Post.find as jest.Mock).mockReturnValue(mockQuery);

    const request = new NextRequest('http://localhost:3000/api/posts/feed?limit=200');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockQuery.limit).toHaveBeenCalledWith(101); // 100 + 1 for hasMore check
  });
});
import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/profile/delete/route';

// モックの設定
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock('@/models/Post', () => ({
  __esModule: true,
  default: {
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
}));

describe('/api/profile/delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('認証されていない場合は401を返す', async () => {
    const { getServerSession } = require('next-auth/next');
    getServerSession.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/profile/delete', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'test123' }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error).toBe('ログインが必要です');
  });

  it('ユーザーが見つからない場合は404を返す', async () => {
    const { getServerSession } = require('next-auth/next');
    const User = require('@/models/User').default;

    getServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    User.findOne.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/profile/delete', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'test123' }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe('ユーザーが見つかりません');
  });

  it('正しいパスワードでアカウントを削除できる', async () => {
    const { getServerSession } = require('next-auth/next');
    const User = require('@/models/User').default;
    const Post = require('@/models/Post').default;

    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      comparePassword: jest.fn().mockResolvedValue(true),
    };

    getServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    User.findOne.mockResolvedValue(mockUser);
    User.deleteOne.mockResolvedValue({ deletedCount: 1 });
    Post.deleteMany.mockResolvedValue({ deletedCount: 5 });
    Post.updateMany.mockResolvedValue({ modifiedCount: 3 });

    const request = new NextRequest('http://localhost:3000/api/profile/delete', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'correctPassword' }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toBe('アカウントが削除されました');

    // 削除処理が呼ばれたことを確認
    expect(Post.deleteMany).toHaveBeenCalledWith({ authorId: 'user123' });
    expect(Post.updateMany).toHaveBeenCalledWith(
      { likes: 'user123' },
      { $pull: { likes: 'user123' }, $inc: { likesCount: -1 } }
    );
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'user123' });
  });

  it('間違ったパスワードの場合は400を返す', async () => {
    const { getServerSession } = require('next-auth/next');
    const User = require('@/models/User').default;

    const mockUser = {
      _id: 'user123',
      email: 'test@example.com',
      comparePassword: jest.fn().mockResolvedValue(false),
    };

    getServerSession.mockResolvedValue({
      user: { email: 'test@example.com' },
    });

    User.findOne.mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/profile/delete', {
      method: 'DELETE',
      body: JSON.stringify({ password: 'wrongPassword' }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('パスワードが正しくありません');

    // 削除処理が呼ばれていないことを確認
    expect(User.deleteOne).not.toHaveBeenCalled();
  });
});
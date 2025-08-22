// モック
jest.mock('next-auth');
jest.mock('../../lib/cloudinary', () => ({
  uploadToCloudinary: jest.fn(),
  deleteFromCloudinary: jest.fn(),
  getTransformationUrl: jest.fn(),
}));
jest.mock('../../models/Image', () => ({
  default: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndDelete: jest.fn(),
  }
}));
jest.mock('../../lib/mongodb', () => ({
  default: jest.fn().mockResolvedValue(true),
}));

import { POST, DELETE } from '../../app/api/upload/route';
import { getServerSession } from 'next-auth';
import * as cloudinary from '../../lib/cloudinary';
import Image from '../../models/Image';
import connectDB from '../../lib/mongodb';

describe('/api/upload', () => {
  const mockSession = {
    user: {
      id: 'user123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (connectDB as jest.Mock).mockResolvedValue(true);
  });

  describe('POST /api/upload', () => {
    it('認証されていない場合は401を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const formData = new FormData();
      const request = new Request('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    it('ファイルがない場合は400を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const formData = new FormData();
      const request = new Request('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ファイルが選択されていません');
    });

    it('有効な画像をアップロードできる', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const mockUploadResult = {
        public_id: 'board-app/user123/test-image',
        secure_url: 'https://res.cloudinary.com/test/image.jpg',
        format: 'jpg',
        width: 1920,
        height: 1080,
        bytes: 204800,
      };

      (cloudinary.uploadToCloudinary as jest.Mock).mockResolvedValue(mockUploadResult);
      (cloudinary.getTransformationUrl as jest.Mock).mockImplementation((id, size) => 
        `https://res.cloudinary.com/test/${size}/${id}`
      );

      const mockImageDoc = {
        _id: 'image123',
        publicId: mockUploadResult.public_id,
        url: mockUploadResult.secure_url,
        thumbnailUrl: 'https://res.cloudinary.com/test/thumbnail/test-image',
        mediumUrl: 'https://res.cloudinary.com/test/medium/test-image',
        largeUrl: 'https://res.cloudinary.com/test/large/test-image',
      };

      (Image.create as jest.Mock).mockResolvedValue(mockImageDoc);

      // テスト用の画像ファイルを作成
      const file = new File(['test image content'], 'test.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const request = {
        formData: jest.fn().mockResolvedValue(formData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.image).toEqual({
        id: 'image123',
        url: mockUploadResult.secure_url,
        thumbnailUrl: 'https://res.cloudinary.com/test/thumbnail/test-image',
        mediumUrl: 'https://res.cloudinary.com/test/medium/test-image',
        largeUrl: 'https://res.cloudinary.com/test/large/test-image',
        width: 1920,
        height: 1080,
        format: 'jpg',
      });
    });

    it('無効な画像形式を拒否する', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const file = new File(['test content'], 'test.gif', { type: 'image/gif' });
      const formData = new FormData();
      formData.append('file', file);

      const request = {
        formData: jest.fn().mockResolvedValue(formData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('対応していない画像形式');
    });

    it('大きすぎるファイルを拒否する', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      // 11MBのファイルを作成
      const largeContent = new ArrayBuffer(11 * 1024 * 1024);
      const file = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', file);

      const request = {
        formData: jest.fn().mockResolvedValue(formData),
      } as any;

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('ファイルサイズが大きすぎます');
    });
  });

  describe('DELETE /api/upload', () => {
    it('認証されていない場合は401を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/upload?id=image123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('認証が必要です');
    });

    it('画像IDが指定されていない場合は400を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const request = new Request('http://localhost:3000/api/upload', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('画像IDが指定されていません');
    });

    it('画像が見つからない場合は404を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      (Image.findById as jest.Mock).mockResolvedValue(null);

      const request = new Request('http://localhost:3000/api/upload?id=nonexistent', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('画像が見つかりません');
    });

    it('他のユーザーの画像を削除しようとすると403を返す', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockImage = {
        _id: 'image123',
        uploadedBy: { toString: () => 'otheruser123' },
        publicId: 'board-app/otheruser/image',
      };
      
      (Image.findById as jest.Mock).mockResolvedValue(mockImage);

      const request = new Request('http://localhost:3000/api/upload?id=image123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('削除権限がありません');
    });

    it('自分の画像を削除できる', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
      
      const mockImage = {
        _id: 'image123',
        uploadedBy: { toString: () => 'user123' },
        publicId: 'board-app/user123/image',
      };
      
      (Image.findById as jest.Mock).mockResolvedValue(mockImage);
      (Image.findByIdAndDelete as jest.Mock).mockResolvedValue(true);
      (cloudinary.deleteFromCloudinary as jest.Mock).mockResolvedValue({ result: 'ok' });

      const request = new Request('http://localhost:3000/api/upload?id=image123', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('画像を削除しました');
      expect(cloudinary.deleteFromCloudinary).toHaveBeenCalledWith('board-app/user123/image');
      expect(Image.findByIdAndDelete).toHaveBeenCalledWith('image123');
    });
  });
});
import {
  validateImage,
  validateMultipleImages,
  processImageBuffer,
  sanitizeFileName,
  getImageDimensions,
  generateImageUrls,
  calculateAspectRatio,
} from '@/utils/imageProcessor';

describe('imageProcessor', () => {
  describe('validateImage', () => {
    it('有効な画像形式を受け入れる', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImage(file, 'image/jpeg', 1024);
      expect(result.isValid).toBe(true);
    });

    it('無効な画像形式を拒否する', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' });
      const result = validateImage(file, 'image/gif', 1024);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('対応していない画像形式');
    });

    it('10MBを超えるファイルを拒否する', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImage(file, 'image/jpeg', 11 * 1024 * 1024);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('ファイルサイズが大きすぎます');
    });

    it('PNGファイルを受け入れる', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      const result = validateImage(file, 'image/png', 5 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });

    it('WebPファイルを受け入れる', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      const result = validateImage(file, 'image/webp', 3 * 1024 * 1024);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateMultipleImages', () => {
    it('4枚以下の画像を受け入れる', () => {
      const files = [
        new File([''], 'test1.jpg', { type: 'image/jpeg' }),
        new File([''], 'test2.jpg', { type: 'image/jpeg' }),
        new File([''], 'test3.jpg', { type: 'image/jpeg' }),
      ];
      const result = validateMultipleImages(files);
      expect(result.isValid).toBe(true);
    });

    it('5枚以上の画像を拒否する', () => {
      const files = Array(5).fill(null).map((_, i) => 
        new File([''], `test${i}.jpg`, { type: 'image/jpeg' })
      );
      const result = validateMultipleImages(files);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('最大4枚まで');
    });

    it('無効な形式が含まれている場合は拒否する', () => {
      const files = [
        new File([''], 'test1.jpg', { type: 'image/jpeg' }),
        new File([''], 'test2.gif', { type: 'image/gif' }),
      ];
      const result = validateMultipleImages(files);
      expect(result.isValid).toBe(false);
    });
  });

  describe('processImageBuffer', () => {
    it('有効なJPEGバッファを処理する', async () => {
      // JPEG magic number: FF D8 FF
      const buffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      const result = await processImageBuffer(buffer, 'image/jpeg');
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(6);
    });

    it('有効なPNGバッファを処理する', async () => {
      // PNG magic number: 89 50 4E 47
      const buffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
      const result = await processImageBuffer(buffer, 'image/png');
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/png');
    });

    it('有効なWebPバッファを処理する', async () => {
      // WebP: RIFF....WEBP
      const buffer = Buffer.from('RIFF    WEBP', 'ascii');
      const result = await processImageBuffer(buffer, 'image/webp');
      expect(result.buffer).toBe(buffer);
      expect(result.mimeType).toBe('image/webp');
    });

    it('無効なマジックナンバーを拒否する', async () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      await expect(processImageBuffer(buffer, 'image/jpeg')).rejects.toThrow('無効な画像ファイル');
    });
  });

  describe('sanitizeFileName', () => {
    it('危険な文字を削除する', () => {
      const fileName = '../../../etc/passwd.jpg';
      const sanitized = sanitizeFileName(fileName);
      expect(sanitized).not.toContain('/');
      expect(sanitized).toMatch(/^\d+_[a-z0-9]+_.*\.jpg$/);
    });

    it('日本語文字を置換する', () => {
      const fileName = 'テスト画像.jpg';
      const sanitized = sanitizeFileName(fileName);
      expect(sanitized).not.toContain('テスト');
      expect(sanitized).toMatch(/^\d+_[a-z0-9]+_.*\.jpg$/);
    });

    it('拡張子を保持する', () => {
      const fileName = 'image.png';
      const sanitized = sanitizeFileName(fileName);
      expect(sanitized.endsWith('.png')).toBe(true);
    });

    it('長いファイル名を切り詰める', () => {
      const longName = 'a'.repeat(100) + '.jpg';
      const sanitized = sanitizeFileName(longName);
      expect(sanitized.length).toBeLessThan(100);
      expect(sanitized.endsWith('.jpg')).toBe(true);
    });
  });

  describe('getImageDimensions', () => {
    it('PNG画像の寸法を取得する', () => {
      // PNGヘッダー: シグネチャ + IHDR チャンク
      const buffer = Buffer.alloc(24);
      // PNG signature
      buffer.writeUInt32BE(0x89504E47, 0);
      buffer.writeUInt32BE(0x0D0A1A0A, 4);
      // IHDR chunk
      buffer.writeUInt32BE(13, 8); // チャンク長
      buffer.writeUInt32BE(0x49484452, 12); // "IHDR"
      buffer.writeUInt32BE(800, 16); // width
      buffer.writeUInt32BE(600, 20); // height
      
      const dimensions = getImageDimensions(buffer, 'image/png');
      expect(dimensions).toEqual({ width: 800, height: 600 });
    });

    it('不完全なバッファの場合はnullを返す', () => {
      const buffer = Buffer.alloc(10);
      const dimensions = getImageDimensions(buffer, 'image/png');
      expect(dimensions).toBeNull();
    });
  });

  describe('generateImageUrls', () => {
    it('すべての変換URLを生成する', () => {
      const urls = generateImageUrls('test-image-id', 'my-cloud');
      
      expect(urls.original).toBe('https://res.cloudinary.com/my-cloud/image/upload/test-image-id');
      expect(urls.thumbnail).toContain('w_300,h_300,c_fill');
      expect(urls.medium).toContain('w_800,h_800,c_limit');
      expect(urls.large).toContain('w_1920,h_1920,c_limit');
    });

    it('品質パラメータを含む', () => {
      const urls = generateImageUrls('test-id', 'cloud-name');
      
      expect(urls.thumbnail).toContain('q_auto:low');
      expect(urls.medium).toContain('q_auto:good');
      expect(urls.large).toContain('q_auto:best');
    });
  });

  describe('calculateAspectRatio', () => {
    it('16:9のアスペクト比を計算する', () => {
      const ratio = calculateAspectRatio(1920, 1080);
      expect(ratio).toBe('16:9');
    });

    it('4:3のアスペクト比を計算する', () => {
      const ratio = calculateAspectRatio(800, 600);
      expect(ratio).toBe('4:3');
    });

    it('1:1のアスペクト比を計算する', () => {
      const ratio = calculateAspectRatio(500, 500);
      expect(ratio).toBe('1:1');
    });

    it('非標準のアスペクト比を計算する', () => {
      const ratio = calculateAspectRatio(1234, 567);
      expect(ratio).toBe('1234:567');
    });
  });
});
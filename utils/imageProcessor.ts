interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

interface ProcessedImage {
  buffer: Buffer;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 4;

export const validateImage = (
  file: File | Buffer,
  mimeType: string,
  size: number
): ImageValidationResult => {
  // MIMEタイプのチェック
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      isValid: false,
      error: '対応していない画像形式です。JPEG、PNG、WebPのみアップロード可能です。',
    };
  }

  // ファイルサイズのチェック
  if (size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます。最大${MAX_FILE_SIZE / 1024 / 1024}MBまでアップロード可能です。`,
    };
  }

  return { isValid: true };
};

export const validateMultipleImages = (files: File[]): ImageValidationResult => {
  if (files.length > MAX_FILES) {
    return {
      isValid: false,
      error: `画像は最大${MAX_FILES}枚までアップロード可能です。`,
    };
  }

  for (const file of files) {
    const validation = validateImage(file, file.type, file.size);
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
};

export const processImageBuffer = async (
  buffer: Buffer,
  mimeType: string
): Promise<ProcessedImage> => {
  // バッファから画像のメタデータを取得
  // 実際の画像処理は Cloudinary で行うため、ここでは基本的な検証のみ
  
  // 画像の magic number をチェック
  const isValidImage = checkImageMagicNumber(buffer, mimeType);
  if (!isValidImage) {
    throw new Error('無効な画像ファイルです');
  }

  return {
    buffer,
    mimeType,
    size: buffer.length,
  };
};

const checkImageMagicNumber = (buffer: Buffer, mimeType: string): boolean => {
  if (buffer.length < 4) return false;

  const magicNumbers: { [key: string]: number[][] } = {
    'image/jpeg': [[0xff, 0xd8, 0xff]],
    'image/jpg': [[0xff, 0xd8, 0xff]],
    'image/png': [[0x89, 0x50, 0x4e, 0x47]],
    'image/webp': [[0x52, 0x49, 0x46, 0x46], [0x57, 0x45, 0x42, 0x50]],
  };

  const expectedMagicNumbers = magicNumbers[mimeType];
  if (!expectedMagicNumbers) return false;

  // JPEG/JPG
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG
  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  // WebP
  if (mimeType === 'image/webp') {
    const riff = buffer.slice(0, 4).toString('ascii');
    const webp = buffer.slice(8, 12).toString('ascii');
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
};

export const sanitizeFileName = (fileName: string): string => {
  // ファイル名から危険な文字を除去
  const baseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  
  // 拡張子を取得
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
  
  return `${timestamp}_${randomString}_${baseName.slice(0, 50)}.${extension}`;
};

export const getImageDimensions = (buffer: Buffer, mimeType: string): { width: number; height: number } | null => {
  try {
    if (mimeType === 'image/png') {
      // PNG のサイズ情報は 16-23 バイト目
      if (buffer.length >= 24) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
    } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      // JPEG のサイズ情報を探す（簡易版）
      let i = 2;
      while (i < buffer.length - 9) {
        if (buffer[i] === 0xff) {
          const marker = buffer[i + 1];
          // SOF markers (0xC0-0xCF except 0xC4, 0xC8, 0xCC)
          if ((marker >= 0xc0 && marker <= 0xcf) && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
          // マーカーの長さを取得してスキップ
          const length = buffer.readUInt16BE(i + 2);
          i += length + 2;
        } else {
          i++;
        }
      }
    }
  } catch (error) {
    console.error('Error getting image dimensions:', error);
  }
  
  return null;
};

export const generateImageUrls = (publicId: string, cloudName: string) => {
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  return {
    original: `${baseUrl}/${publicId}`,
    thumbnail: `${baseUrl}/w_300,h_300,c_fill,g_auto,q_auto:low/${publicId}`,
    medium: `${baseUrl}/w_800,h_800,c_limit,q_auto:good/${publicId}`,
    large: `${baseUrl}/w_1920,h_1920,c_limit,q_auto:best/${publicId}`,
  };
};

export const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

export default {
  validateImage,
  validateMultipleImages,
  processImageBuffer,
  sanitizeFileName,
  getImageDimensions,
  generateImageUrls,
  calculateAspectRatio,
};
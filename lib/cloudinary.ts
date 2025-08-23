import { v2 as cloudinary } from 'cloudinary';

// 環境変数の確認とログ出力
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Cloudinary environment variables are missing:', {
    cloud_name: cloudName ? 'Set' : 'Missing',
    api_key: apiKey ? 'Set' : 'Missing',
    api_secret: apiSecret ? 'Set' : 'Missing',
  });
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export const uploadToCloudinary = async (
  file: Buffer,
  options: {
    folder?: string;
    publicId?: string;
    resourceType?: 'image' | 'video' | 'raw' | 'auto';
  } = {}
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const uploadOptions: any = {
      folder: options.folder || 'board-app',
      public_id: options.publicId,
      resource_type: options.resourceType || 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      max_file_size: 10485760, // 10MB
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
      secure: true,
    };

    console.log('Cloudinary upload options:', {
      folder: uploadOptions.folder,
      public_id: uploadOptions.public_id,
      cloud_name: cloudName,
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('Cloudinary upload success:', result?.public_id);
          resolve(result);
        }
      }
    );

    uploadStream.end(file);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<any> => {
  return cloudinary.uploader.destroy(publicId);
};

export const getTransformationUrl = (
  publicId: string,
  transformation: 'thumbnail' | 'medium' | 'large'
): string => {
  const transformations = {
    thumbnail: {
      width: 300,
      height: 300,
      crop: 'fill',
      gravity: 'auto',
      quality: 'auto:low',
    },
    medium: {
      width: 800,
      height: 800,
      crop: 'limit',
      quality: 'auto:good',
    },
    large: {
      width: 1920,
      height: 1920,
      crop: 'limit',
      quality: 'auto:best',
    },
  };

  return cloudinary.url(publicId, {
    transformation: transformations[transformation],
    secure: true,
  });
};

export default cloudinary;
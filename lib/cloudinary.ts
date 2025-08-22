import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
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
    const uploadOptions = {
      folder: options.folder || 'board-app',
      public_id: options.publicId,
      resource_type: options.resourceType || 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      max_file_size: 10485760, // 10MB
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ],
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
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
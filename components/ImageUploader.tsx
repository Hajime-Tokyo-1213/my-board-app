'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardActions,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Paper,
  Fade,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Close,
  Image as ImageIcon,
  CheckCircle,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { validateMultipleImages } from '@/utils/imageProcessor';

interface UploadedImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  width: number;
  height: number;
  format: string;
}

interface ImageUploaderProps {
  maxFiles?: number;
  maxSize?: number;
  onUpload?: (images: UploadedImage[]) => void;
  onError?: (error: string) => void;
  existingImages?: UploadedImage[];
  onRemove?: (imageId: string) => void;
}

interface UploadingFile {
  file: File;
  preview: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
  uploadedImage?: UploadedImage;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  maxFiles = 4,
  maxSize = 10 * 1024 * 1024,
  onUpload,
  onError,
  existingImages = [],
  onRemove,
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(existingImages);
  const [error, setError] = useState<string>('');

  const uploadFile = async (file: File): Promise<UploadedImage> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/simple', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'アップロードに失敗しました');
    }

    const data = await response.json();
    return data.image;
  };

  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // 既存の画像と新しいファイルの合計をチェック
      const totalFiles = uploadedImages.length + acceptedFiles.length;
      if (totalFiles > maxFiles) {
        const errorMsg = `画像は最大${maxFiles}枚までアップロード可能です`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // ファイルバリデーション
      const validation = validateMultipleImages(acceptedFiles);
      if (!validation.isValid) {
        setError(validation.error!);
        onError?.(validation.error!);
        return;
      }

      setError('');

      // プレビューを作成
      const newUploadingFiles: UploadingFile[] = acceptedFiles.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

      // 各ファイルを順次アップロード
      const uploadedResults: UploadedImage[] = [];

      for (let i = 0; i < newUploadingFiles.length; i++) {
        const uploadingFile = newUploadingFiles[i];
        
        try {
          // プログレスを更新
          setUploadingFiles(prev =>
            prev.map((f, index) =>
              index === uploadingFiles.length + i
                ? { ...f, progress: 50 }
                : f
            )
          );

          // アップロード実行
          const uploadedImage = await uploadFile(uploadingFile.file);
          uploadedResults.push(uploadedImage);

          // 成功状態に更新
          setUploadingFiles(prev =>
            prev.map((f, index) =>
              index === uploadingFiles.length + i
                ? { ...f, progress: 100, status: 'success', uploadedImage }
                : f
            )
          );
        } catch (error) {
          // エラー状態に更新
          const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
          setUploadingFiles(prev =>
            prev.map((f, index) =>
              index === uploadingFiles.length + i
                ? { ...f, status: 'error', error: errorMessage }
                : f
            )
          );
        }
      }

      // アップロード成功した画像を追加
      if (uploadedResults.length > 0) {
        setUploadedImages(prev => [...prev, ...uploadedResults]);
        onUpload?.(uploadedResults);
      }

      // プレビューURLをクリーンアップ
      setTimeout(() => {
        newUploadingFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
      }, 3000);
    },
    [uploadedImages, maxFiles, onUpload, onError, uploadingFiles.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxSize,
    maxFiles: maxFiles - uploadedImages.length,
    disabled: uploadedImages.length >= maxFiles,
  });

  const handleRemoveImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/upload?id=${imageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploadedImages(prev => prev.filter(img => img.id !== imageId));
        onRemove?.(imageId);
      } else {
        throw new Error('削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to remove image:', error);
      setError('画像の削除に失敗しました');
    }
  };

  const remainingSlots = maxFiles - uploadedImages.length;

  return (
    <Box>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {remainingSlots > 0 && (
        <Paper
          {...getRootProps()}
          sx={{
            p: 3,
            mb: 2,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            bgcolor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.3s',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          <input {...getInputProps()} />
          <Box sx={{ textAlign: 'center' }}>
            <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive
                ? 'ドロップしてアップロード'
                : 'クリックまたはドラッグ&ドロップ'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              JPEG、PNG、WebP形式 (最大{maxSize / 1024 / 1024}MB)
            </Typography>
            <Chip
              label={`残り${remainingSlots}枚アップロード可能`}
              size="small"
              color="primary"
              sx={{ mt: 1 }}
            />
          </Box>
        </Paper>
      )}

      <Grid container spacing={2}>
        {/* アップロード済み画像 */}
        {uploadedImages.map((image) => (
          <Grid item xs={6} sm={3} key={image.id}>
            <Fade in>
              <Card sx={{ position: 'relative' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={image.thumbnailUrl}
                  alt="Uploaded image"
                  sx={{ objectFit: 'cover' }}
                />
                <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
                  <Tooltip title="アップロード完了">
                    <CheckCircle color="success" fontSize="small" />
                  </Tooltip>
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveImage(image.id)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Fade>
          </Grid>
        ))}

        {/* アップロード中のファイル */}
        {uploadingFiles.map((file, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card sx={{ position: 'relative' }}>
              <CardMedia
                component="img"
                height="140"
                image={file.preview}
                alt="Uploading"
                sx={{ 
                  objectFit: 'cover',
                  opacity: file.status === 'error' ? 0.5 : 1,
                }}
              />
              {file.status === 'uploading' && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                  <LinearProgress variant="determinate" value={file.progress} />
                </Box>
              )}
              <CardActions sx={{ justifyContent: 'space-between', p: 1 }}>
                {file.status === 'uploading' && (
                  <CircularProgress size={20} />
                )}
                {file.status === 'success' && (
                  <CheckCircle color="success" fontSize="small" />
                )}
                {file.status === 'error' && (
                  <Tooltip title={file.error}>
                    <ErrorIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
                <Typography variant="caption" noWrap sx={{ flex: 1, mx: 1 }}>
                  {file.file.name}
                </Typography>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {uploadedImages.length === 0 && uploadingFiles.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <ImageIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
          <Typography variant="body2" color="text.secondary">
            画像がアップロードされていません
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ImageUploader;
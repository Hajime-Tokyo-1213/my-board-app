import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateImage, processImageBuffer, sanitizeFileName } from '@/utils/imageProcessor';
import { uploadToCloudinary, getTransformationUrl, deleteFromCloudinary } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30秒のタイムアウト

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    // FormDataの取得
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイルバリデーション
    const validation = validateImage(file, file.type, file.size);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // ファイルをバッファに変換
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 画像処理とバリデーション
    const processedImage = await processImageBuffer(buffer, file.type);

    // ファイル名のサニタイズ
    const sanitizedFileName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}_${sanitizedFileName.split('.')[0]}`;

    try {
      // Cloudinaryにアップロード
      console.log('Uploading to Cloudinary...');
      const uploadResult = await uploadToCloudinary(buffer, {
        folder: `board-app/${session.user.id}`,
        publicId: uniqueFileName,
      });

      console.log('Upload successful:', uploadResult.public_id);

      // 各サイズのURLを生成
      const thumbnailUrl = getTransformationUrl(uploadResult.public_id, 'thumbnail');
      const mediumUrl = getTransformationUrl(uploadResult.public_id, 'medium');
      const largeUrl = getTransformationUrl(uploadResult.public_id, 'large');

      // レスポンス
      return NextResponse.json({
        success: true,
        image: {
          id: uploadResult.public_id,
          url: uploadResult.secure_url,
          thumbnailUrl,
          mediumUrl,
          largeUrl,
          width: uploadResult.width || 1920,
          height: uploadResult.height || 1080,
          format: uploadResult.format || file.type.split('/')[1],
        },
      });
    } catch (uploadError: any) {
      console.error('Cloudinary upload error:', uploadError);
      console.error('Error details:', uploadError.message);
      return NextResponse.json(
        { error: `アップロードに失敗しました: ${uploadError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'アップロードに失敗しました' },
      { status: 500 }
    );
  }
}

// 画像削除API
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('id');

    if (!publicId) {
      return NextResponse.json(
        { error: '画像IDが指定されていません' },
        { status: 400 }
      );
    }

    try {
      // Cloudinaryから削除
      console.log('Deleting from Cloudinary:', publicId);
      await deleteFromCloudinary(publicId);
      
      return NextResponse.json({
        success: true,
        message: '画像を削除しました',
      });
    } catch (deleteError: any) {
      console.error('Cloudinary delete error:', deleteError);
      return NextResponse.json(
        { error: `削除に失敗しました: ${deleteError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Image from '@/models/Image';
import { uploadToCloudinary, getTransformationUrl } from '@/lib/cloudinary';
import { validateImage, processImageBuffer, sanitizeFileName } from '@/utils/imageProcessor';

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
    const postId = formData.get('postId') as string | null;

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
    const publicId = `board-app/${session.user.id}/${sanitizedFileName}`;

    try {
      // Cloudinaryにアップロード
      const uploadResult = await uploadToCloudinary(buffer, {
        folder: `board-app/${session.user.id}`,
        publicId: sanitizedFileName.split('.')[0],
      });

      // 各サイズのURLを生成
      const thumbnailUrl = getTransformationUrl(uploadResult.public_id, 'thumbnail');
      const mediumUrl = getTransformationUrl(uploadResult.public_id, 'medium');
      const largeUrl = getTransformationUrl(uploadResult.public_id, 'large');

      // MongoDBに保存
      await connectDB();
      
      const imageDoc = await Image.create({
        publicId: uploadResult.public_id,
        url: uploadResult.secure_url,
        thumbnailUrl,
        mediumUrl,
        largeUrl,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes,
        uploadedBy: session.user.id,
        postId: postId || undefined,
      });

      return NextResponse.json({
        success: true,
        image: {
          id: imageDoc._id,
          url: uploadResult.secure_url,
          thumbnailUrl,
          mediumUrl,
          largeUrl,
          width: uploadResult.width,
          height: uploadResult.height,
          format: uploadResult.format,
        },
      });
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return NextResponse.json(
        { error: 'アップロードに失敗しました' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: '画像のアップロードに失敗しました' },
      { status: 500 }
    );
  }
}

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
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { error: '画像IDが指定されていません' },
        { status: 400 }
      );
    }

    await connectDB();

    // 画像情報を取得
    const image = await Image.findById(imageId);
    
    if (!image) {
      return NextResponse.json(
        { error: '画像が見つかりません' },
        { status: 404 }
      );
    }

    // 所有者チェック
    if (image.uploadedBy.toString() !== session.user.id) {
      return NextResponse.json(
        { error: '削除権限がありません' },
        { status: 403 }
      );
    }

    // Cloudinaryから削除
    const { deleteFromCloudinary } = await import('@/lib/cloudinary');
    await deleteFromCloudinary(image.publicId);

    // MongoDBから削除
    await Image.findByIdAndDelete(imageId);

    return NextResponse.json({
      success: true,
      message: '画像を削除しました',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '画像の削除に失敗しました' },
      { status: 500 }
    );
  }
}
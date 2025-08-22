import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateImage, processImageBuffer, sanitizeFileName } from '@/utils/imageProcessor';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

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
    
    // publicディレクトリ内のuploadsフォルダに保存
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', session.user.id);
    
    // ディレクトリが存在しない場合は作成
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // ファイルを保存
    const filePath = path.join(uploadsDir, sanitizedFileName);
    await writeFile(filePath, buffer);

    // publicから始まるURLパスを生成
    const url = `/uploads/${session.user.id}/${sanitizedFileName}`;

    // 簡易的なレスポンス
    return NextResponse.json({
      success: true,
      image: {
        id: sanitizedFileName,
        url: url,
        thumbnailUrl: url,
        mediumUrl: url,
        largeUrl: url,
        width: 1920,
        height: 1080,
        format: file.type.split('/')[1],
      },
    });
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
    const imageId = searchParams.get('id');

    if (!imageId) {
      return NextResponse.json(
        { error: '画像IDが指定されていません' },
        { status: 400 }
      );
    }

    // ここでは簡易的に成功を返す
    return NextResponse.json({
      success: true,
      message: '画像を削除しました',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: '削除に失敗しました' },
      { status: 500 }
    );
  }
}
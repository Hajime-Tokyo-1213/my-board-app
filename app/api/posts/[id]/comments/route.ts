import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Post from '@/models/Post';
import mongoose from 'mongoose';
import { validateComment, sanitizeMongoQuery } from '@/lib/sanitize';
import { rateLimitMiddleware, rateLimits, getClientIp } from '@/lib/rate-limit';
import { createCommentNotification } from '@/lib/notifications';

// コメント取得（ページネーション対応・MongoDB集計パイプライン使用）
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // レート制限チェック
    const rateLimitResponse = await rateLimitMiddleware(
      request,
      { window: 60000, max: 30 } // 1分間に30リクエスト
    );
    if (rateLimitResponse) return rateLimitResponse;

    await dbConnect();

    // パラメータのサニタイズ
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    // MongoDBインジェクション対策
    const postId = sanitizeMongoQuery(params.id);
    
    // 投稿IDの検証
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { error: '無効な投稿IDです' },
        { status: 400 }
      );
    }

    // 投稿の存在確認（lean()で軽量化）
    const post = await Post.findById(postId).select('_id').lean();
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // MongoDB集計パイプラインで効率的にデータ取得
    const pipeline = [
      // 指定された投稿のコメントのみフィルタ
      { $match: { postId: new mongoose.Types.ObjectId(postId) } },
      
      // ソート（新しい順）
      { $sort: { createdAt: -1 } },
      
      // 総数を計算するためのファセット
      {
        $facet: {
          // ページネーション用のコメント
          comments: [
            { $skip: skip },
            { $limit: limit },
            // 必要なフィールドのみ選択
            {
              $project: {
                _id: 1,
                content: 1,
                authorId: 1,
                authorName: 1,
                authorEmail: 1,
                authorImage: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
          ],
          // 総数カウント
          totalCount: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const [result] = await Comment.aggregate(pipeline);
    
    const comments = result.comments || [];
    const totalComments = result.totalCount[0]?.count || 0;
    const hasMore = totalComments > skip + comments.length;

    // レスポンスヘッダーにキャッシュ制御を追加
    const response = NextResponse.json({
      success: true,
      data: {
        comments,
        pagination: {
          total: totalComments,
          page,
          limit,
          hasMore,
          pages: Math.ceil(totalComments / limit)
        }
      }
    });

    // キャッシュヘッダー（10秒間キャッシュ）
    response.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    
    return response;
  } catch (error) {
    console.error('コメント取得エラー:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'コメントの取得に失敗しました',
        message: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

// コメント投稿（XSS対策・バリデーション強化）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false,
          error: '認証が必要です',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // レート制限チェック（ユーザーごと）
    const rateLimitResponse = await rateLimitMiddleware(
      request,
      { window: 60000, max: 5 }, // 1分間に5コメント
      session.user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    await dbConnect();

    // リクエストボディの取得
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { 
          success: false,
          error: '無効なリクエストです'
        },
        { status: 400 }
      );
    }

    const { content } = body;

    // コメントのバリデーションとサニタイゼーション
    const validation = validateComment(content);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: validation.error,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // 投稿IDの検証
    const postId = sanitizeMongoQuery(params.id);
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json(
        { 
          success: false,
          error: '無効な投稿IDです'
        },
        { status: 400 }
      );
    }

    // 投稿の存在確認（authorIdとtitleも取得）
    const post = await Post.findById(postId).select('_id authorId title').lean();
    if (!post) {
      return NextResponse.json(
        { 
          success: false,
          error: '投稿が見つかりません'
        },
        { status: 404 }
      );
    }

    // トランザクションを使用してコメント作成とカウント更新を原子的に実行
    const mongoSession = await mongoose.startSession();
    let newComment;

    try {
      await mongoSession.withTransaction(async () => {
        // コメント作成（サニタイズ済みのコンテンツを使用）
        newComment = await Comment.create([{
          content: validation.sanitized,
          postId: postId,
          authorId: session.user.id,
          authorName: session.user.name || 'Unknown',
          authorEmail: session.user.email || '',
          authorImage: session.user.image || null
        }], { session: mongoSession });

        // 投稿のコメント数を更新
        await Post.findByIdAndUpdate(
          postId,
          { $inc: { commentsCount: 1 } },
          { session: mongoSession }
        );
      });
    } finally {
      await mongoSession.endSession();
    }

    // 投稿者への通知を作成（自分の投稿へのコメントの場合は通知しない）
    if (post.authorId && post.authorId.toString() !== session.user.id) {
      await createCommentNotification(
        post.authorId,
        session.user.id,
        session.user.name || 'ユーザー',
        postId,
        newComment[0]._id,
        post.title || '無題の投稿'
      );
    }

    // 成功レスポンス
    return NextResponse.json(
      {
        success: true,
        data: newComment[0],
        message: 'コメントを投稿しました'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('コメント投稿エラー:', error);
    
    // MongoDBのバリデーションエラーをキャッチ
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'データの検証に失敗しました',
          details: process.env.NODE_ENV === 'development' ? error.errors : undefined
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'コメントの投稿に失敗しました',
        message: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
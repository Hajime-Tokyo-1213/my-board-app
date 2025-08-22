import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import Post from '@/models/Post';
import { authOptions } from '@/lib/auth';
import { createLikeNotification } from '@/lib/notifications';

// いいねを追加/削除
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('Like API called');
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user?.id) {
      console.log('No user ID in session');
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    console.log('User ID from session:', session.user.id);
    await dbConnect();

    // paramsをawaitで取得
    const { id } = await params;
    console.log('Post ID:', id);

    // 投稿を取得
    const post = await Post.findById(id);
    if (!post) {
      console.log('Post not found:', id);
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    console.log('Post found:', post._id);

    // likesフィールドが存在しない場合は初期化
    if (!post.likes) {
      post.likes = [];
    }
    if (post.likesCount === undefined || post.likesCount === null) {
      post.likesCount = 0;
    }

    // 既存のlikesフィールドをクリーンアップ（ObjectIDを文字列に変換）
    if (Array.isArray(post.likes)) {
      post.likes = post.likes.map((like: any) => {
        if (like && typeof like === 'object' && like.toString) {
          return like.toString();
        }
        return like;
      }).filter((like: any) => typeof like === 'string');
    }

    // session.user.idを使用（文字列のユーザーID）
    const userId = session.user.id;
    console.log('Before like - Post likes:', post.likes);
    console.log('Current user ID:', userId);

    // すでにいいねしているかチェック（文字列として比較）
    const likeIndex = post.likes.findIndex(
      (likeId: string) => likeId === userId
    );
    
    let liked = false;
    
    if (likeIndex > -1) {
      // いいねを削除
      post.likes.splice(likeIndex, 1);
      liked = false;
    } else {
      // いいねを追加（文字列のユーザーIDを保存）
      post.likes.push(userId);
      liked = true;
    }
    
    // likesCountを更新
    post.likesCount = post.likes.length;
    
    // markModifiedを使用して変更を明示的にマーク
    post.markModified('likes');
    post.markModified('likesCount');
    
    // 保存
    try {
      await post.save();
      console.log('Post saved successfully');
    } catch (saveError) {
      console.error('Error saving post:', saveError);
      throw new Error(`Failed to save post: ${(saveError as Error).message}`);
    }
    
    // いいねした場合のみ通知を作成
    if (liked && post.authorId && post.authorId.toString() !== userId) {
      const currentUser = await dbConnect().then(() => 
        session.user.name || 'ユーザー'
      );
      
      await createLikeNotification(
        post.authorId,
        userId,
        currentUser,
        post._id,
        post.title || '無題の投稿'
      );
    }
    
    console.log('After operation - Post likes:', post.likes);
    console.log('Likes count:', post.likesCount);
    console.log('Operation:', liked ? 'Liked' : 'Unliked');
    
    return NextResponse.json({
      success: true,
      liked: liked,
      likesCount: post.likesCount,
      message: liked ? 'いいねしました' : 'いいねを取り消しました'
    });
    
  } catch (error) {
    console.error('いいねエラー 詳細:', error);
    const err = error as Error;
    console.error('Error stack:', err?.stack || 'No stack');
    console.error('Error message:', err?.message || String(error));
    
    const errorMessage = err?.message || 'いいねの処理に失敗しました';
    const errorDetails = {
      error: errorMessage,
      details: String(error),
      type: err?.name || 'Unknown Error'
    };
    
    return new NextResponse(JSON.stringify(errorDetails), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
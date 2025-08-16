import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

// プロフィール取得
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email })
      .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');
    
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        bio: user.bio || '',
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      }
    });
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// プロフィール更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { name, bio } = await request.json();

    // バリデーション
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名前は必須です' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: '名前は50文字以内で入力してください' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 200) {
      return NextResponse.json(
        { error: '自己紹介は200文字以内で入力してください' },
        { status: 400 }
      );
    }

    await dbConnect();

    const updatedUser = await User.findOneAndUpdate(
      { email: session.user.email },
      { 
        name: name.trim(),
        bio: bio ? bio.trim() : ''
      },
      { new: true }
    ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'プロフィールを更新しました',
      data: {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        bio: updatedUser.bio || '',
      }
    });
  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}
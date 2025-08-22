import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { validatePrivacySettings, mergePrivacySettings } from '@/models/PrivacySettings';

// GET: プライバシー設定を取得
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email })
      .select('privacySettings')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: user.privacySettings || {},
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'プライバシー設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// PUT: プライバシー設定を更新
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: '設定データが必要です' },
        { status: 400 }
      );
    }

    // 設定の検証
    const validation = validatePrivacySettings(settings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: '無効な設定です', errors: validation.errors },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 既存の設定とマージ
    const currentSettings = user.privacySettings || {};
    const mergedSettings = mergePrivacySettings(currentSettings, settings);

    // 非公開アカウントの設定変更時の処理
    if (settings.isPrivate !== undefined && settings.isPrivate !== currentSettings.isPrivate) {
      if (settings.isPrivate) {
        // 非公開に変更
        mergedSettings.requireFollowApproval = true;
        
        // 既存のフォロワーは維持（オプション）
        // 新規フォローのみ承認制になる
      } else {
        // 公開に変更
        mergedSettings.requireFollowApproval = false;
        
        // ペンディングのフォローリクエストを自動承認（オプション）
        if (user.pendingFollowers && user.pendingFollowers.length > 0) {
          const FollowRequest = require('@/models/FollowRequest').default;
          await FollowRequest.bulkApprove(user.pendingFollowers);
        }
      }
    }

    // 設定を更新
    user.privacySettings = mergedSettings;
    await user.save();

    return NextResponse.json({
      message: 'プライバシー設定を更新しました',
      settings: mergedSettings,
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'プライバシー設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

// POST: プライバシー設定をリセット
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      );
    }

    const { pathname } = new URL(request.url);
    
    // /api/privacy/reset エンドポイントの処理
    if (pathname.endsWith('/reset')) {
      await dbConnect();

      const user = await User.findOne({ email: session.user.email });
      if (!user) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      // デフォルト設定にリセット
      const { defaultPrivacySettings } = await import('@/models/PrivacySettings');
      user.privacySettings = defaultPrivacySettings;
      await user.save();

      return NextResponse.json({
        message: 'プライバシー設定をリセットしました',
        settings: defaultPrivacySettings,
      });
    }

    return NextResponse.json(
      { error: '無効なエンドポイントです' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error resetting privacy settings:', error);
    return NextResponse.json(
      { error: 'プライバシー設定のリセットに失敗しました' },
      { status: 500 }
    );
  }
}
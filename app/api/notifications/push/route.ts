import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { connectToDatabase } from '@/lib/mongodb';

// VAPIDキーの設定
webpush.setVapidDetails(
  'mailto:admin@boardapp.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, title, body, data } = await request.json();
    
    if (!userId || !title || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // ユーザーの購読情報を取得
    const subscriptions = await db
      .collection('push_subscriptions')
      .find({ userId })
      .toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for user' },
        { status: 404 }
      );
    }

    // 通知ペイロード
    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      data: {
        ...data,
        timestamp: Date.now()
      }
    });

    // 各購読に通知を送信
    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(subscription, payload);
          return { success: true, endpoint: subscription.endpoint };
        } catch (error: any) {
          // 購読が無効な場合は削除
          if (error.statusCode === 410) {
            await db.collection('push_subscriptions').deleteOne({
              endpoint: subscription.endpoint
            });
          }
          return { 
            success: false, 
            endpoint: subscription.endpoint,
            error: error.message 
          };
        }
      })
    );

    // 結果を集計
    const successful = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      sent: successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
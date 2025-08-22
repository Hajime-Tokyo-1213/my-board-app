import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    
    // TODO: ユーザー認証を実装
    // const session = await getSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const { db } = await connectToDatabase();
    
    // 購読情報を保存（重複チェック）
    await db.collection('push_subscriptions').updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          ...subscription,
          // userId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      success: true,
      message: 'Push subscription saved successfully' 
    });
  } catch (error) {
    console.error('Failed to save subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
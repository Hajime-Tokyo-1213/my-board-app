import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const encoder = new TextEncoder();

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      await connectDB();
      
      const sendEvent = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent({ type: 'connected', message: 'SSE connection established' });

      const checkInterval = setInterval(async () => {
        try {
          const unreadCount = await Notification.countDocuments({
            userId: session.user.id,
            read: false
          });

          const latestNotifications = await Notification.find({
            userId: session.user.id,
            read: false
          })
            .populate('fromUserId', 'username profileImage')
            .populate('postId', 'title')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

          sendEvent({
            type: 'update',
            unreadCount,
            notifications: latestNotifications
          });
        } catch (error) {
          console.error('Error in SSE stream:', error);
        }
      }, 5000);

      request.signal.addEventListener('abort', () => {
        clearInterval(checkInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
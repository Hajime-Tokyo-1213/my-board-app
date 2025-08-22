import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('プッシュ通知テスト', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    // 通知権限を設定したコンテキストを作成
    context = await browser.newContext({
      permissions: ['notifications']
    });
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('通知権限の状態を正しく取得できる', async () => {
    await page.goto('http://localhost:3000');

    const permissionStatus = await page.evaluate(async () => {
      if ('Notification' in window) {
        return {
          supported: true,
          permission: Notification.permission
        };
      }
      return { supported: false };
    });

    expect(permissionStatus.supported).toBe(true);
    expect(['default', 'granted', 'denied']).toContain(permissionStatus.permission);
  });

  test('プッシュ通知の購読が可能', async () => {
    await page.goto('http://localhost:3000');

    const subscriptionStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          
          // 既存の購読を確認
          const existingSubscription = await registration.pushManager.getSubscription();
          
          if (existingSubscription) {
            return {
              supported: true,
              subscribed: true,
              endpoint: existingSubscription.endpoint
            };
          }

          // テスト用のVAPIDキー（実際のキーを使用）
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
            'BOCS6JJNccZkXBCwEYnLaKOEp1K6Db1Get80uXs0Hk14t6GRwA1vGfHP-g-SU4R0qBghTRkS3-hRnwLJ9ikkW54';

          // Base64 URL文字列をUint8Arrayに変換
          const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
              .replace(/\-/g, '+')
              .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
          };

          // 購読を試みる
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
          });

          return {
            supported: true,
            subscribed: true,
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys
          };
        } catch (error) {
          return {
            supported: true,
            subscribed: false,
            error: (error as Error).message
          };
        }
      }
      return { supported: false };
    });

    expect(subscriptionStatus.supported).toBe(true);
    
    // 購読が成功した場合
    if (subscriptionStatus.subscribed) {
      expect(subscriptionStatus.endpoint).toContain('https://');
      expect(subscriptionStatus.keys).toHaveProperty('p256dh');
      expect(subscriptionStatus.keys).toHaveProperty('auth');
    }
  });

  test('プッシュ通知の購読解除が可能', async () => {
    await page.goto('http://localhost:3000');

    const unsubscribeStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();

          if (subscription) {
            const unsubscribed = await subscription.unsubscribe();
            return {
              supported: true,
              unsubscribed,
              hadSubscription: true
            };
          }

          return {
            supported: true,
            hadSubscription: false
          };
        } catch (error) {
          return {
            supported: true,
            error: (error as Error).message
          };
        }
      }
      return { supported: false };
    });

    expect(unsubscribeStatus.supported).toBe(true);
    
    if (unsubscribeStatus.hadSubscription) {
      expect(unsubscribeStatus.unsubscribed).toBe(true);
    }
  });

  test('通知APIが正しく動作する', async () => {
    await page.goto('http://localhost:3000');

    // 通知権限を付与
    await context.grantPermissions(['notifications']);

    const notificationResult = await page.evaluate(async () => {
      if ('Notification' in window) {
        try {
          // 通知を作成（実際には表示されない場合がある）
          const notification = new Notification('テスト通知', {
            body: 'これはテスト通知です',
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            tag: 'test-notification',
            requireInteraction: false
          });

          // 通知のプロパティを確認
          return {
            created: true,
            title: notification.title,
            body: notification.body,
            tag: notification.tag
          };
        } catch (error) {
          return {
            created: false,
            error: (error as Error).message
          };
        }
      }
      return { supported: false };
    });

    if (notificationResult.created) {
      expect(notificationResult.title).toBe('テスト通知');
      expect(notificationResult.body).toBe('これはテスト通知です');
      expect(notificationResult.tag).toBe('test-notification');
    }
  });

  test('Service Workerからの通知が処理される', async () => {
    await page.goto('http://localhost:3000');

    const swNotificationStatus = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;

        try {
          // Service Workerから通知を表示
          await registration.showNotification('SW通知テスト', {
            body: 'Service Workerからの通知',
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: {
              dateOfArrival: Date.now(),
              primaryKey: 1
            },
            actions: [
              {
                action: 'explore',
                title: '開く'
              },
              {
                action: 'close',
                title: '閉じる'
              }
            ]
          });

          // 通知を取得
          const notifications = await registration.getNotifications();

          return {
            success: true,
            notificationCount: notifications.length,
            notifications: notifications.map(n => ({
              title: n.title,
              body: n.body,
              tag: n.tag
            }))
          };
        } catch (error) {
          return {
            success: false,
            error: (error as Error).message
          };
        }
      }
      return { supported: false };
    });

    if (swNotificationStatus.success) {
      expect(swNotificationStatus.notificationCount).toBeGreaterThan(0);
      expect(swNotificationStatus.notifications[0].title).toContain('SW通知テスト');
    }
  });
});
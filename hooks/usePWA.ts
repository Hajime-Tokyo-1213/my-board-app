'use client';

import { useState, useEffect, useCallback } from 'react';
import { Workbox } from 'workbox-window';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface PWAState {
  isInstalled: boolean;
  isOffline: boolean;
  isUpdateAvailable: boolean;
  subscription: PushSubscription | null;
  notificationPermission: NotificationPermission;
}

export function usePWA() {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isOffline: false,
    isUpdateAvailable: false,
    subscription: null,
    notificationPermission: 'default'
  });

  const [workbox, setWorkbox] = useState<Workbox | null>(null);

  // Service Worker登録とWorkbox初期化
  useEffect(() => {
    if ('serviceWorker' in navigator && window.workbox !== undefined) {
      const wb = new Workbox('/sw.js');
      setWorkbox(wb);

      // Service Worker更新検知
      wb.addEventListener('waiting', () => {
        setState(prev => ({ ...prev, isUpdateAvailable: true }));
      });

      // Service Worker更新後のリロード
      wb.addEventListener('controlling', () => {
        window.location.reload();
      });

      // Service Worker登録
      wb.register();
    }
  }, []);

  // インストール状態の検知
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInstalled = isStandalone || window.navigator.standalone || document.referrer.includes('android-app://');
      setState(prev => ({ ...prev, isInstalled }));
    };

    checkInstalled();
    
    // インストール成功イベント
    window.addEventListener('appinstalled', checkInstalled);
    
    return () => {
      window.removeEventListener('appinstalled', checkInstalled);
    };
  }, []);

  // オンライン/オフライン状態の監視
  useEffect(() => {
    const updateOnlineStatus = () => {
      setState(prev => ({ ...prev, isOffline: !navigator.onLine }));
    };

    updateOnlineStatus();

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // 通知権限の状態を取得
  useEffect(() => {
    if ('Notification' in window) {
      setState(prev => ({ 
        ...prev, 
        notificationPermission: Notification.permission 
      }));
    }
  }, []);

  // Service Worker更新を適用
  const applyUpdate = useCallback(() => {
    if (workbox) {
      workbox.messageSkipWaiting();
      workbox.addEventListener('controlling', () => {
        window.location.reload();
      });
    }
  }, [workbox]);

  // プッシュ通知の購読
  const subscribePush = useCallback(async () => {
    try {
      // 通知権限をリクエスト
      const permission = await Notification.requestPermission();
      setState(prev => ({ 
        ...prev, 
        notificationPermission: permission 
      }));

      if (permission !== 'granted') {
        throw new Error('通知が許可されませんでした');
      }

      // Service Worker取得
      const registration = await navigator.serviceWorker.ready;

      // Push購読
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        )
      });

      // サーバーに購読情報を送信
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('購読の保存に失敗しました');
      }

      // 状態を更新
      const subscriptionJSON = subscription.toJSON();
      setState(prev => ({ 
        ...prev, 
        subscription: {
          endpoint: subscriptionJSON.endpoint!,
          keys: {
            p256dh: subscriptionJSON.keys!.p256dh,
            auth: subscriptionJSON.keys!.auth
          }
        }
      }));

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      throw error;
    }
  }, []);

  // プッシュ通知の購読解除
  const unsubscribePush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        
        // サーバーから購読情報を削除
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });

        setState(prev => ({ ...prev, subscription: null }));
      }
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      throw error;
    }
  }, []);

  // オフラインデータの同期
  const syncOfflineData = useCallback(async () => {
    if ('sync' in navigator.serviceWorker.registration) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.sync.register('sync-posts');
        console.log('Background sync registered');
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }, []);

  // キャッシュのクリア
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }, []);

  return {
    ...state,
    applyUpdate,
    subscribePush,
    unsubscribePush,
    syncOfflineData,
    clearCache
  };
}

// Base64 URL文字列をUint8Arrayに変換
function urlBase64ToUint8Array(base64String: string): Uint8Array {
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
}

// オンライン状態を監視するフック
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Service Worker登録状態を監視するフック
export function useServiceWorker() {
  const [isReady, setIsReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);
        setIsReady(true);
      });
    }
  }, []);

  return { isReady, registration };
}
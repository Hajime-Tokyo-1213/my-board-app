'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export default function NotificationPermission() {
  const { notificationPermission, subscribePush } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // クライアントサイドでのみ実行
  useEffect(() => {
    setIsMounted(true);
    if ('Notification' in window) {
      setShowPrompt(Notification.permission === 'default');
    }
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await subscribePush();
      setShowPrompt(false);
      
      // 成功メッセージ
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('通知が有効になりました', {
          body: '新しい投稿やコメントをお知らせします',
          icon: '/icon-192x192.png',
          badge: '/icon-72x72.png',
        });
      }
    } catch (err) {
      setError('通知の有効化に失敗しました');
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // 7日後に再表示
    localStorage.setItem('notification-prompt-dismissed', Date.now().toString());
  };

  // マウント前またはNotificationが使えない、表示条件を満たさない場合は何も表示しない
  if (!isMounted || !showPrompt || notificationPermission !== 'default') {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-4 max-w-sm bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-40">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
        aria-label="閉じる"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Bell className="w-8 h-8 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            通知を有効にする
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            新しいフォロー、いいね、コメントの通知を受け取れます
          </p>

          {error && (
            <p className="text-sm text-red-600 mb-3">{error}</p>
          )}

          <div className="flex space-x-2">
            <button
              onClick={handleEnableNotifications}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '設定中...' : '有効にする'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              後で
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 通知設定コンポーネント（設定画面用）
export function NotificationSettings() {
  const { notificationPermission, subscription, subscribePush, unsubscribePush } = usePWA();
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);

    try {
      if (subscription) {
        await unsubscribePush();
      } else {
        await subscribePush();
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {subscription ? (
            <Bell className="w-6 h-6 text-green-500" />
          ) : (
            <BellOff className="w-6 h-6 text-gray-400" />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">プッシュ通知</h3>
            <p className="text-sm text-gray-600">
              {subscription
                ? '通知が有効になっています'
                : notificationPermission === 'denied'
                ? 'ブラウザの設定で通知が拒否されています'
                : '通知が無効になっています'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggle}
          disabled={isLoading || notificationPermission === 'denied'}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            subscription
              ? 'bg-blue-600'
              : 'bg-gray-200'
          } ${
            isLoading || notificationPermission === 'denied'
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              subscription ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {notificationPermission === 'denied' && (
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            通知を有効にするには、ブラウザの設定から通知を許可してください。
          </p>
        </div>
      )}
    </div>
  );
}
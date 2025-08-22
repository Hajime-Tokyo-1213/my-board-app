'use client';

import { useOnlineStatus } from '@/hooks/usePWA';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // オンラインに復帰した時の通知
      setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 3000);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-yellow-500 text-gray-900'
      }`}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center space-x-2">
          {isOnline ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="font-medium">接続が復旧しました</span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              <span className="font-medium">
                オフラインです - 一部の機能が制限されています
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
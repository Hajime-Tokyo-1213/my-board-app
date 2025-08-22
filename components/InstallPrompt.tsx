'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // インストール済みかチェック
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // iOS Safari チェック
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    
    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // iOSの場合は初回訪問から24時間後に表示
      const lastPrompt = localStorage.getItem('ios-install-prompt');
      if (!lastPrompt || Date.now() - parseInt(lastPrompt) > 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    }

    // beforeinstallpromptイベントの処理
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // 最後の表示から7日経過していたら表示
      const lastPrompt = localStorage.getItem('install-prompt-dismissed');
      if (!lastPrompt || Date.now() - parseInt(lastPrompt) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // アプリインストール成功の検知
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setIsInstalled(true);
      } else {
        console.log('User dismissed the install prompt');
        localStorage.setItem('install-prompt-dismissed', Date.now().toString());
      }
    } catch (error) {
      console.error('Error during installation:', error);
    } finally {
      setDeferredPrompt(null);
      setShowBanner(false);
    }
  };

  const handleIOSInstall = () => {
    localStorage.setItem('ios-install-prompt', Date.now().toString());
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    if (isIOS) {
      localStorage.setItem('ios-install-prompt', Date.now().toString());
    } else {
      localStorage.setItem('install-prompt-dismissed', Date.now().toString());
    }
  };

  if (!showBanner || isInstalled) return null;

  // iOS用のインストール案内
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 animate-slide-up">
        <div className="max-w-md mx-auto p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Smartphone className="w-10 h-10 text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">
                ホーム画面に追加
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                アプリのように使えます。Safari の共有ボタン
                <span className="inline-block mx-1">
                  <svg className="w-4 h-4 inline" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                </span>
                から「ホーム画面に追加」を選択してください。
              </p>
              <button
                onClick={handleIOSInstall}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                わかりました
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/デスクトップ用のインストールバナー
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl z-50 animate-slide-up">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Download className="w-8 h-8" />
            <div>
              <h3 className="font-semibold text-lg">
                Board Appをインストール
              </h3>
              <p className="text-sm opacity-90">
                ホーム画面に追加してアプリのように使えます
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstall}
              className="px-6 py-2 bg-white text-blue-600 rounded-full font-medium hover:bg-gray-100 transition-colors"
            >
              インストール
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// スタイルのためのCSSアニメーション（tailwind.config.jsに追加）
// @keyframes slide-up {
//   from {
//     transform: translateY(100%);
//   }
//   to {
//     transform: translateY(0);
//   }
// }
// .animate-slide-up {
//   animation: slide-up 0.3s ease-out;
// }
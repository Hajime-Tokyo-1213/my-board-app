'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MentionUser } from '@/hooks/useMention';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface MentionSuggestionsProps {
  suggestions: MentionUser[];
  selectedIndex: number;
  searchQuery: string;
  loading: boolean;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement>;
}

const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  suggestions,
  selectedIndex,
  searchQuery,
  loading,
  onSelect,
  onClose,
  containerRef,
  inputRef,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isAbove, setIsAbove] = useState(false);

  // ポップアップの位置を計算
  useEffect(() => {
    if (!inputRef.current || !containerRef.current) return;

    const calculatePosition = () => {
      const input = inputRef.current;
      const container = containerRef.current;
      
      if (!input) return;

      // カーソル位置を取得
      const cursorPosition = input.selectionStart || 0;
      const text = input.value.substring(0, cursorPosition);
      
      // @の位置を見つける
      let atPosition = -1;
      for (let i = cursorPosition - 1; i >= 0; i--) {
        if (text[i] === '@') {
          atPosition = i;
          break;
        }
        if (text[i] === ' ' || text[i] === '\n') {
          break;
        }
      }

      if (atPosition === -1) return;

      // 入力要素の位置とサイズを取得
      const inputRect = input.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // ポップアップの推定高さ
      const popupHeight = Math.min(suggestions.length * 64 + 16, 320); // 各項目64px、最大320px

      // 画面下部に十分なスペースがあるか確認
      const spaceBelow = window.innerHeight - inputRect.bottom;
      const spaceAbove = inputRect.top;
      const shouldShowAbove = spaceBelow < popupHeight && spaceAbove > spaceBelow;

      // textareaの場合の行数を考慮
      let offsetTop = 0;
      if (input instanceof HTMLTextAreaElement) {
        const lineHeight = parseInt(window.getComputedStyle(input).lineHeight) || 20;
        const lines = text.substring(0, atPosition).split('\n').length - 1;
        offsetTop = lines * lineHeight;
      }

      setPosition({
        top: shouldShowAbove 
          ? -popupHeight - 8
          : inputRect.height + 8 + offsetTop,
        left: 0,
      });
      setIsAbove(shouldShowAbove);
    };

    calculatePosition();
    
    // ウィンドウサイズ変更時に再計算
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [suggestions, inputRef, containerRef]);

  // 選択項目をスクロールして表示
  useEffect(() => {
    if (!listRef.current) return;

    const selectedElement = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement;

    if (selectedElement) {
      selectedElement.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [selectedIndex]);

  // アイテムクリック処理
  const handleItemClick = (user: MentionUser, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(user);
  };

  // 空の候補リストの表示
  if (!loading && suggestions.length === 0 && searchQuery.length > 0) {
    return (
      <div
        className={cn(
          'absolute z-50 w-64',
          'bg-white rounded-lg shadow-lg border border-gray-200',
          'py-3 px-4 text-sm text-gray-500',
          isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
        style={{ top: position.top, left: position.left }}
      >
        「{searchQuery}」に一致するユーザーが見つかりません
      </div>
    );
  }

  // ローディング表示
  if (loading && suggestions.length === 0) {
    return (
      <div
        className={cn(
          'absolute z-50 w-64',
          'bg-white rounded-lg shadow-lg border border-gray-200',
          'py-3 px-4',
          isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
        style={{ top: position.top, left: position.left }}
      >
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>検索中...</span>
        </div>
      </div>
    );
  }

  // 候補リスト表示
  if (suggestions.length > 0) {
    return (
      <div
        ref={listRef}
        className={cn(
          'absolute z-50 w-80',
          'bg-white rounded-lg shadow-lg border border-gray-200',
          'max-h-80 overflow-y-auto',
          isAbove ? 'bottom-full mb-2' : 'top-full mt-2'
        )}
        style={{ top: position.top, left: position.left }}
      >
        <div className="py-2">
          {suggestions.map((user, index) => (
            <button
              key={user._id}
              data-index={index}
              onClick={(e) => handleItemClick(user, e)}
              className={cn(
                'w-full px-4 py-3',
                'flex items-center space-x-3',
                'hover:bg-gray-50 transition-colors',
                'text-left focus:outline-none',
                selectedIndex === index && 'bg-blue-50'
              )}
            >
              {/* ユーザーアバター */}
              <div className="relative flex-shrink-0">
                {user.profileImage ? (
                  <Image
                    src={user.profileImage}
                    alt={user.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-gray-600 font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* ユーザー情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.name}
                  </p>
                  {user.isVerified && (
                    <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">
                  @{user.username}
                </p>
              </div>

              {/* 選択インジケーター */}
              {selectedIndex === index && (
                <div className="flex-shrink-0">
                  <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    選択中
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* ヘルプテキスト */}
        <div className="border-t border-gray-200 px-4 py-2">
          <p className="text-xs text-gray-500">
            ↑↓ で選択、Enter で確定、Esc でキャンセル
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default MentionSuggestions;
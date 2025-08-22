'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from 'lodash';

export interface MentionUser {
  _id: string;
  username: string;
  name: string;
  profileImage?: string;
  isVerified?: boolean;
}

export interface MentionData {
  userId: string;
  username: string;
  position: {
    start: number;
    end: number;
  };
}

interface UseMentionOptions {
  onSearch?: (query: string) => Promise<MentionUser[]>;
  debounceMs?: number;
  maxSuggestions?: number;
  minQueryLength?: number;
}

export function useMention(options: UseMentionOptions = {}) {
  const {
    onSearch,
    debounceMs = 300,
    maxSuggestions = 10,
    minQueryLength = 1
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentionPosition, setMentionPosition] = useState<{ start: number; end: number } | null>(null);
  const [activeMentions, setActiveMentions] = useState<MentionData[]>([]);
  
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isComposing = useRef(false);

  // ユーザー検索のデバウンス処理
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < minQueryLength) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let users: MentionUser[] = [];
        
        if (onSearch) {
          users = await onSearch(query);
        } else {
          // デフォルトのAPI呼び出し
          const response = await fetch(`/api/users/search/mention?query=${encodeURIComponent(query)}&limit=${maxSuggestions}`);
          if (response.ok) {
            const data = await response.json();
            users = data.users;
          }
        }
        
        setSuggestions(users.slice(0, maxSuggestions));
      } catch (error) {
        console.error('Failed to search users:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs),
    [onSearch, maxSuggestions, minQueryLength]
  );

  // @文字の検出と候補表示
  const detectMention = useCallback((text: string, cursorPosition: number) => {
    // IME入力中は処理しない
    if (isComposing.current) return;

    // カーソル位置から前方向に@を探す
    let atPosition = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      const char = text[i];
      
      // スペースや改行が見つかったら探索終了
      if (char === ' ' || char === '\n' || char === '\r') {
        break;
      }
      
      // @が見つかった
      if (char === '@') {
        // @の前が文字でない場合のみ有効（単語の先頭の@のみ）
        if (i === 0 || /\s/.test(text[i - 1])) {
          atPosition = i;
          break;
        }
      }
    }

    if (atPosition !== -1) {
      // @から現在のカーソル位置までの文字列を取得
      const query = text.substring(atPosition + 1, cursorPosition);
      
      // 日本語を含む文字列の判定（スペースを含まない）
      if (!query.includes(' ')) {
        setSearchQuery(query);
        setMentionPosition({ start: atPosition, end: cursorPosition });
        setIsOpen(true);
        setSelectedIndex(0);
        debouncedSearch(query);
      } else {
        closeMention();
      }
    } else {
      closeMention();
    }
  }, [debouncedSearch]);

  // メンション候補を選択
  const selectMention = useCallback((user: MentionUser) => {
    if (!inputRef.current || !mentionPosition) return;

    const input = inputRef.current;
    const text = input.value;
    
    // @を含むメンション部分を置換
    const before = text.substring(0, mentionPosition.start);
    const after = text.substring(mentionPosition.end);
    const mentionText = `@${user.username} `;
    
    const newText = before + mentionText + after;
    const newCursorPosition = mentionPosition.start + mentionText.length;
    
    // テキストを更新
    input.value = newText;
    
    // カーソル位置を設定
    input.setSelectionRange(newCursorPosition, newCursorPosition);
    
    // メンションデータを保存
    const newMention: MentionData = {
      userId: user._id,
      username: user.username,
      position: {
        start: mentionPosition.start,
        end: mentionPosition.start + mentionText.length - 1
      }
    };
    
    setActiveMentions(prev => [...prev, newMention]);
    
    // 入力イベントを発火
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);
    
    closeMention();
  }, [mentionPosition]);

  // メンション候補を閉じる
  const closeMention = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
    setSelectedIndex(0);
    setSearchQuery('');
    setMentionPosition(null);
  }, []);

  // キーボード操作
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
        
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex]);
        }
        break;
        
      case 'Tab':
        if (suggestions.length > 0) {
          e.preventDefault();
          selectMention(suggestions[0]);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        closeMention();
        break;
    }
  }, [isOpen, suggestions, selectedIndex, selectMention, closeMention]);

  // IME入力の制御
  const handleCompositionStart = useCallback(() => {
    isComposing.current = true;
  }, []);

  const handleCompositionEnd = useCallback(() => {
    isComposing.current = false;
    
    // IME確定後にメンション検出を実行
    if (inputRef.current) {
      const text = inputRef.current.value;
      const cursorPosition = inputRef.current.selectionStart || 0;
      detectMention(text, cursorPosition);
    }
  }, [detectMention]);

  // メンションをパース
  const parseMentions = useCallback((text: string): MentionData[] => {
    const mentions: MentionData[] = [];
    const mentionRegex = /@([a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
    
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const username = match[1];
      const existingMention = activeMentions.find(
        m => m.username === username
      );
      
      if (existingMention) {
        mentions.push({
          ...existingMention,
          position: {
            start: match.index,
            end: match.index + match[0].length
          }
        });
      }
    }
    
    return mentions;
  }, [activeMentions]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return {
    // State
    isOpen,
    suggestions,
    selectedIndex,
    searchQuery,
    loading,
    activeMentions,
    
    // Refs
    inputRef,
    
    // Actions
    detectMention,
    selectMention,
    closeMention,
    parseMentions,
    
    // Event handlers
    handleKeyDown,
    handleCompositionStart,
    handleCompositionEnd,
    
    // Utilities
    setInputRef: (ref: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (ref) {
        inputRef.current = ref;
      }
    }
  };
}
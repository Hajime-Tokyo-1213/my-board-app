'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useMention } from '@/hooks/useMention';
import MentionSuggestions from './MentionSuggestions';
import { cn } from '@/lib/utils';

export interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions?: any[]) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onSubmit?: () => void;
  autoFocus?: boolean;
  name?: string;
  id?: string;
}

export interface MentionInputRef {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  insertText: (text: string) => void;
}

const MentionInput = forwardRef<MentionInputRef, MentionInputProps>(
  (
    {
      value,
      onChange,
      placeholder = '投稿を入力...',
      className,
      multiline = false,
      rows = 3,
      maxLength,
      disabled = false,
      required = false,
      onFocus,
      onBlur,
      onKeyDown,
      onSubmit,
      autoFocus = false,
      name,
      id,
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const {
      isOpen,
      suggestions,
      selectedIndex,
      searchQuery,
      loading,
      activeMentions,
      detectMention,
      selectMention,
      closeMention,
      handleKeyDown: mentionKeyDown,
      handleCompositionStart,
      handleCompositionEnd,
      setInputRef,
    } = useMention();

    // 入力要素の参照を設定
    useEffect(() => {
      if (inputRef.current) {
        setInputRef(inputRef.current);
      }
    }, [setInputRef]);

    // ref経由で公開するメソッド
    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
      clear: () => {
        if (inputRef.current) {
          inputRef.current.value = '';
          onChange('', []);
        }
      },
      insertText: (text: string) => {
        if (inputRef.current) {
          const input = inputRef.current;
          const start = input.selectionStart || 0;
          const end = input.selectionEnd || 0;
          const newValue = value.substring(0, start) + text + value.substring(end);
          onChange(newValue, activeMentions);
          
          // カーソル位置を調整
          setTimeout(() => {
            const newPosition = start + text.length;
            input.setSelectionRange(newPosition, newPosition);
          }, 0);
        }
      },
    }));

    // 入力処理
    const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPosition = e.target.selectionStart || 0;
      
      onChange(newValue, activeMentions);
      detectMention(newValue, cursorPosition);
    };

    // キーボードイベント処理
    const handleKeyDownEvent = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // メンション候補が開いている場合の処理
      if (isOpen) {
        mentionKeyDown(e);
        
        // Enterキーでのメンション選択を優先
        if (e.key === 'Enter' && suggestions.length > 0) {
          return;
        }
      }
      
      // Ctrl+Enter or Cmd+Enter で送信
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && onSubmit) {
        e.preventDefault();
        onSubmit();
        return;
      }
      
      // その他のキーイベントを親に伝播
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    // 選択変更時の処理（カーソル移動時）
    const handleSelectionChange = () => {
      if (inputRef.current) {
        const cursorPosition = inputRef.current.selectionStart || 0;
        detectMention(value, cursorPosition);
      }
    };

    // フォーカス処理
    const handleFocus = () => {
      if (onFocus) {
        onFocus();
      }
    };

    // ブラー処理
    const handleBlur = () => {
      // メンション候補を少し遅れて閉じる（クリックイベントを待つため）
      setTimeout(() => {
        closeMention();
      }, 200);
      
      if (onBlur) {
        onBlur();
      }
    };

    // 共通のprops
    const inputProps = {
      ref: inputRef as any,
      value,
      onChange: handleInput,
      onKeyDown: handleKeyDownEvent,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onSelect: handleSelectionChange,
      onCompositionStart: handleCompositionStart,
      onCompositionEnd: handleCompositionEnd,
      placeholder,
      disabled,
      required,
      maxLength,
      autoFocus,
      name,
      id,
      className: cn(
        'w-full px-3 py-2',
        'border border-gray-300 rounded-lg',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        'disabled:bg-gray-100 disabled:cursor-not-allowed',
        'transition-colors duration-200',
        className
      ),
    };

    return (
      <div ref={containerRef} className="relative">
        {multiline ? (
          <textarea {...inputProps} rows={rows} />
        ) : (
          <input {...inputProps} type="text" />
        )}
        
        {/* メンション候補表示 */}
        {isOpen && (
          <MentionSuggestions
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            searchQuery={searchQuery}
            loading={loading}
            onSelect={selectMention}
            onClose={closeMention}
            containerRef={containerRef}
            inputRef={inputRef}
          />
        )}
        
        {/* 文字数カウンター */}
        {maxLength && (
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {value.length} / {maxLength}
          </div>
        )}
      </div>
    );
  }
);

MentionInput.displayName = 'MentionInput';

export default MentionInput;
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MentionInput from '@/components/MentionInput';
import '@testing-library/jest-dom';

// useMentionフックのモック
jest.mock('@/hooks/useMention', () => ({
  useMention: () => ({
    isOpen: false,
    suggestions: [],
    selectedIndex: 0,
    searchQuery: '',
    loading: false,
    activeMentions: [],
    detectMention: jest.fn(),
    selectMention: jest.fn(),
    closeMention: jest.fn(),
    handleKeyDown: jest.fn(),
    handleCompositionStart: jest.fn(),
    handleCompositionEnd: jest.fn(),
    setInputRef: jest.fn(),
  }),
}));

// MentionSuggestionsコンポーネントのモック
jest.mock('@/components/MentionSuggestions', () => {
  return function MockMentionSuggestions({ suggestions, onSelect }: any) {
    if (suggestions.length === 0) return null;
    return (
      <div data-testid="mention-suggestions">
        {suggestions.map((user: any) => (
          <button
            key={user._id}
            onClick={() => onSelect(user)}
            data-testid={`suggestion-${user.username}`}
          >
            {user.name} (@{user.username})
          </button>
        ))}
      </div>
    );
  };
});

describe('MentionInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'テキストを入力...',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('基本的な動作', () => {
    it('入力フィールドをレンダリング', () => {
      render(<MentionInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      expect(input).toBeInTheDocument();
    });

    it('値の変更を処理', async () => {
      const onChange = jest.fn();
      render(<MentionInput {...defaultProps} onChange={onChange} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      await userEvent.type(input, 'Hello');
      
      expect(onChange).toHaveBeenCalledTimes(5); // 各文字で呼ばれる
      expect(onChange).toHaveBeenLastCalledWith('Hello', []);
    });

    it('multilineプロパティでtextareaをレンダリング', () => {
      render(<MentionInput {...defaultProps} multiline />);
      
      const textarea = screen.getByPlaceholderText('テキストを入力...');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('単一行の場合inputをレンダリング', () => {
      render(<MentionInput {...defaultProps} multiline={false} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      expect(input.tagName).toBe('INPUT');
    });

    it('disabledプロパティを適用', () => {
      render(<MentionInput {...defaultProps} disabled />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      expect(input).toBeDisabled();
    });

    it('requiredプロパティを適用', () => {
      render(<MentionInput {...defaultProps} required />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      expect(input).toBeRequired();
    });
  });

  describe('文字数カウンター', () => {
    it('maxLengthが設定されている場合カウンターを表示', () => {
      render(<MentionInput {...defaultProps} value="Hello" maxLength={100} />);
      
      expect(screen.getByText('5 / 100')).toBeInTheDocument();
    });

    it('maxLengthが設定されていない場合カウンターを表示しない', () => {
      render(<MentionInput {...defaultProps} value="Hello" />);
      
      expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
    });
  });

  describe('メンション候補の表示', () => {
    it('isOpenがtrueの場合候補を表示', () => {
      const useMention = require('@/hooks/useMention').useMention;
      useMention.mockReturnValue({
        isOpen: true,
        suggestions: [
          { _id: '1', username: 'user1', name: 'User One' },
          { _id: '2', username: 'user2', name: 'User Two' },
        ],
        selectedIndex: 0,
        searchQuery: 'user',
        loading: false,
        activeMentions: [],
        detectMention: jest.fn(),
        selectMention: jest.fn(),
        closeMention: jest.fn(),
        handleKeyDown: jest.fn(),
        handleCompositionStart: jest.fn(),
        handleCompositionEnd: jest.fn(),
        setInputRef: jest.fn(),
      });

      render(<MentionInput {...defaultProps} />);
      
      expect(screen.getByTestId('mention-suggestions')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-user1')).toBeInTheDocument();
      expect(screen.getByTestId('suggestion-user2')).toBeInTheDocument();
    });

    it('isOpenがfalseの場合候補を表示しない', () => {
      render(<MentionInput {...defaultProps} />);
      
      expect(screen.queryByTestId('mention-suggestions')).not.toBeInTheDocument();
    });
  });

  describe('キーボードショートカット', () => {
    it('Ctrl+Enterで送信', () => {
      const onSubmit = jest.fn();
      render(<MentionInput {...defaultProps} onSubmit={onSubmit} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('Cmd+Enterで送信（Mac）', () => {
      const onSubmit = jest.fn();
      render(<MentionInput {...defaultProps} onSubmit={onSubmit} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.keyDown(input, { key: 'Enter', metaKey: true });
      
      expect(onSubmit).toHaveBeenCalled();
    });

    it('メンション候補が開いている場合、Enterキーはメンション選択を優先', () => {
      const useMention = require('@/hooks/useMention').useMention;
      const handleKeyDown = jest.fn();
      useMention.mockReturnValue({
        isOpen: true,
        suggestions: [{ _id: '1', username: 'user1', name: 'User One' }],
        selectedIndex: 0,
        searchQuery: 'user',
        loading: false,
        activeMentions: [],
        detectMention: jest.fn(),
        selectMention: jest.fn(),
        closeMention: jest.fn(),
        handleKeyDown,
        handleCompositionStart: jest.fn(),
        handleCompositionEnd: jest.fn(),
        setInputRef: jest.fn(),
      });

      const onSubmit = jest.fn();
      render(<MentionInput {...defaultProps} onSubmit={onSubmit} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(handleKeyDown).toHaveBeenCalled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Ref API', () => {
    it('focus メソッドを公開', () => {
      const ref = React.createRef<any>();
      render(<MentionInput {...defaultProps} ref={ref} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      jest.spyOn(input, 'focus');
      
      ref.current?.focus();
      expect(input.focus).toHaveBeenCalled();
    });

    it('blur メソッドを公開', () => {
      const ref = React.createRef<any>();
      render(<MentionInput {...defaultProps} ref={ref} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      jest.spyOn(input, 'blur');
      
      ref.current?.blur();
      expect(input.blur).toHaveBeenCalled();
    });

    it('clear メソッドを公開', () => {
      const onChange = jest.fn();
      const ref = React.createRef<any>();
      render(<MentionInput {...defaultProps} value="Hello" onChange={onChange} ref={ref} />);
      
      ref.current?.clear();
      
      expect(onChange).toHaveBeenCalledWith('', []);
    });

    it('insertText メソッドを公開', async () => {
      const onChange = jest.fn();
      const ref = React.createRef<any>();
      render(<MentionInput {...defaultProps} value="Hello" onChange={onChange} ref={ref} />);
      
      ref.current?.insertText(' World');
      
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith('Hello World', []);
      });
    });
  });

  describe('イベントハンドラ', () => {
    it('onFocusハンドラを呼び出す', () => {
      const onFocus = jest.fn();
      render(<MentionInput {...defaultProps} onFocus={onFocus} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.focus(input);
      
      expect(onFocus).toHaveBeenCalled();
    });

    it('onBlurハンドラを呼び出す', async () => {
      const onBlur = jest.fn();
      render(<MentionInput {...defaultProps} onBlur={onBlur} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.blur(input);
      
      await waitFor(() => {
        expect(onBlur).toHaveBeenCalled();
      }, { timeout: 300 });
    });

    it('onKeyDownハンドラを呼び出す', () => {
      const onKeyDown = jest.fn();
      render(<MentionInput {...defaultProps} onKeyDown={onKeyDown} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.keyDown(input, { key: 'a' });
      
      expect(onKeyDown).toHaveBeenCalled();
    });
  });

  describe('IME対応', () => {
    it('compositionStartイベントを処理', () => {
      const useMention = require('@/hooks/useMention').useMention;
      const handleCompositionStart = jest.fn();
      useMention.mockReturnValue({
        isOpen: false,
        suggestions: [],
        selectedIndex: 0,
        searchQuery: '',
        loading: false,
        activeMentions: [],
        detectMention: jest.fn(),
        selectMention: jest.fn(),
        closeMention: jest.fn(),
        handleKeyDown: jest.fn(),
        handleCompositionStart,
        handleCompositionEnd: jest.fn(),
        setInputRef: jest.fn(),
      });

      render(<MentionInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.compositionStart(input);
      
      expect(handleCompositionStart).toHaveBeenCalled();
    });

    it('compositionEndイベントを処理', () => {
      const useMention = require('@/hooks/useMention').useMention;
      const handleCompositionEnd = jest.fn();
      useMention.mockReturnValue({
        isOpen: false,
        suggestions: [],
        selectedIndex: 0,
        searchQuery: '',
        loading: false,
        activeMentions: [],
        detectMention: jest.fn(),
        selectMention: jest.fn(),
        closeMention: jest.fn(),
        handleKeyDown: jest.fn(),
        handleCompositionStart: jest.fn(),
        handleCompositionEnd,
        setInputRef: jest.fn(),
      });

      render(<MentionInput {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      fireEvent.compositionEnd(input);
      
      expect(handleCompositionEnd).toHaveBeenCalled();
    });
  });

  describe('カスタムスタイル', () => {
    it('カスタムclassNameを適用', () => {
      render(<MentionInput {...defaultProps} className="custom-class" />);
      
      const input = screen.getByPlaceholderText('テキストを入力...');
      expect(input).toHaveClass('custom-class');
    });
  });
});
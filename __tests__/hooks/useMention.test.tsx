import { renderHook, act, waitFor } from '@testing-library/react';
import { useMention } from '@/hooks/useMention';

// fetch のモック
global.fetch = jest.fn();

describe('useMention Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('@入力の検出', () => {
    it('@文字を検出して候補表示を開く', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@user', 5);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.searchQuery).toBe('user');
    });

    it('単語の途中の@は無視する', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('email@example.com', 17);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('@の後にスペースがある場合は候補を閉じる', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@ ', 2);
      });

      expect(result.current.isOpen).toBe(false);
    });

    it('複数の@がある場合、カーソル位置に最も近い@を検出', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@user1 @user2', 13);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.searchQuery).toBe('user2');
    });
  });

  describe('日本語入力対応', () => {
    it('ひらがなユーザー名を検出', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@たなか', 4);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.searchQuery).toBe('たなか');
    });

    it('カタカナユーザー名を検出', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@タナカ', 4);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.searchQuery).toBe('タナカ');
    });

    it('漢字ユーザー名を検出', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@田中', 3);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.searchQuery).toBe('田中');
    });

    it('IME変換中は検出しない', () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.handleCompositionStart();
      });

      act(() => {
        result.current.detectMention('@user', 5);
      });

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.handleCompositionEnd();
      });
    });
  });

  describe('ユーザー検索', () => {
    it('検索APIを呼び出す', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            {
              _id: '1',
              username: 'testuser',
              name: 'Test User',
              profileImage: '/avatar.jpg',
              isVerified: true,
            },
          ],
        }),
      });

      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@test', 5);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/users/search/mention?query=test')
        );
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(1);
        expect(result.current.suggestions[0].username).toBe('testuser');
      });
    });

    it('カスタム検索関数を使用', async () => {
      const customSearch = jest.fn().mockResolvedValue([
        {
          _id: '1',
          username: 'customuser',
          name: 'Custom User',
        },
      ]);

      const { result } = renderHook(() =>
        useMention({ onSearch: customSearch })
      );

      act(() => {
        result.current.detectMention('@custom', 7);
      });

      await waitFor(() => {
        expect(customSearch).toHaveBeenCalledWith('custom');
        expect(result.current.suggestions[0].username).toBe('customuser');
      });
    });

    it('最大候補数を制限', async () => {
      const users = Array.from({ length: 20 }, (_, i) => ({
        _id: String(i),
        username: `user${i}`,
        name: `User ${i}`,
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users }),
      });

      const { result } = renderHook(() =>
        useMention({ maxSuggestions: 5 })
      );

      act(() => {
        result.current.detectMention('@user', 5);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(5);
      });
    });
  });

  describe('キーボード操作', () => {
    beforeEach(async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [
            { _id: '1', username: 'user1', name: 'User 1' },
            { _id: '2', username: 'user2', name: 'User 2' },
            { _id: '3', username: 'user3', name: 'User 3' },
          ],
        }),
      });
    });

    it('↓キーで次の候補を選択', async () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@user', 5);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(3);
      });

      const event = {
        key: 'ArrowDown',
        preventDefault: jest.fn(),
      } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.selectedIndex).toBe(1);
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('↑キーで前の候補を選択', async () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@user', 5);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(3);
      });

      const event = {
        key: 'ArrowUp',
        preventDefault: jest.fn(),
      } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.selectedIndex).toBe(2); // 最後の項目に移動
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('Enterキーで候補を選択', async () => {
      const { result } = renderHook(() => useMention());

      // inputRefを設定
      const mockInput = {
        value: '@user',
        selectionStart: 5,
        selectionEnd: 5,
        setSelectionRange: jest.fn(),
        dispatchEvent: jest.fn(),
      };
      result.current.setInputRef(mockInput as any);

      act(() => {
        result.current.detectMention('@user', 5);
      });

      await waitFor(() => {
        expect(result.current.suggestions.length).toBe(3);
      });

      const event = {
        key: 'Enter',
        preventDefault: jest.fn(),
      } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockInput.value).toContain('@user1');
      expect(result.current.isOpen).toBe(false);
    });

    it('Escapeキーで候補を閉じる', async () => {
      const { result } = renderHook(() => useMention());

      act(() => {
        result.current.detectMention('@user', 5);
      });

      await waitFor(() => {
        expect(result.current.isOpen).toBe(true);
      });

      const event = {
        key: 'Escape',
        preventDefault: jest.fn(),
      } as any;

      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('メンション選択', () => {
    it('選択したユーザーをテキストに挿入', () => {
      const { result } = renderHook(() => useMention());

      const mockInput = {
        value: 'Hello @user',
        selectionStart: 11,
        selectionEnd: 11,
        setSelectionRange: jest.fn(),
        dispatchEvent: jest.fn(),
      };
      result.current.setInputRef(mockInput as any);

      act(() => {
        result.current.detectMention('Hello @user', 11);
      });

      const user = {
        _id: '1',
        username: 'john_doe',
        name: 'John Doe',
      };

      act(() => {
        result.current.selectMention(user);
      });

      expect(mockInput.value).toBe('Hello @john_doe ');
      expect(mockInput.setSelectionRange).toHaveBeenCalledWith(17, 17);
      expect(result.current.isOpen).toBe(false);
    });

    it('複数のメンションを管理', () => {
      const { result } = renderHook(() => useMention());

      const mockInput = {
        value: '@user1 ',
        selectionStart: 7,
        selectionEnd: 7,
        setSelectionRange: jest.fn(),
        dispatchEvent: jest.fn(),
      };
      result.current.setInputRef(mockInput as any);

      // 最初のメンション
      act(() => {
        result.current.detectMention('@user1', 6);
      });

      act(() => {
        result.current.selectMention({
          _id: '1',
          username: 'user1',
          name: 'User 1',
        });
      });

      expect(result.current.activeMentions.length).toBe(1);

      // 2番目のメンション
      mockInput.value = '@user1 @user2 ';
      mockInput.selectionStart = 14;
      mockInput.selectionEnd = 14;

      act(() => {
        result.current.detectMention('@user1 @user2', 13);
      });

      act(() => {
        result.current.selectMention({
          _id: '2',
          username: 'user2',
          name: 'User 2',
        });
      });

      expect(result.current.activeMentions.length).toBe(2);
    });
  });

  describe('パフォーマンス', () => {
    it('検索をデバウンス処理', async () => {
      jest.useFakeTimers();

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ users: [] }),
      });

      const { result } = renderHook(() =>
        useMention({ debounceMs: 300 })
      );

      act(() => {
        result.current.detectMention('@a', 2);
      });

      act(() => {
        result.current.detectMention('@ab', 3);
      });

      act(() => {
        result.current.detectMention('@abc', 4);
      });

      expect(global.fetch).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('query=abc')
        );
      });

      jest.useRealTimers();
    });

    it('最小クエリ長を確認', async () => {
      const { result } = renderHook(() =>
        useMention({ minQueryLength: 2 })
      );

      act(() => {
        result.current.detectMention('@a', 2);
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.loading).toBe(false);

      act(() => {
        result.current.detectMention('@ab', 3);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });
    });
  });
});
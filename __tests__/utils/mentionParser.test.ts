import {
  extractMentions,
  convertMentionsToHTML,
  segmentTextWithMentions,
  validateMentions,
  isValidUsername,
  sanitizeMentionText,
  createDisplayText,
} from '@/utils/mentionParser';

describe('mentionParser', () => {
  describe('extractMentions', () => {
    it('単一のメンションを抽出', () => {
      const text = 'Hello @user1!';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toEqual({
        username: 'user1',
        position: { start: 6, end: 12 },
        text: '@user1',
      });
    });

    it('複数のメンションを抽出', () => {
      const text = '@user1 and @user2 are here';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(2);
      expect(mentions[0].username).toBe('user1');
      expect(mentions[1].username).toBe('user2');
    });

    it('日本語のメンションを抽出', () => {
      const text = 'こんにちは @田中さん と @山田さん';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(2);
      expect(mentions[0].username).toBe('田中さん');
      expect(mentions[1].username).toBe('山田さん');
    });

    it('ひらがなのメンションを抽出', () => {
      const text = '@たなか さんこんにちは';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].username).toBe('たなか');
    });

    it('カタカナのメンションを抽出', () => {
      const text = '@タナカ さんこんにちは';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].username).toBe('タナカ');
    });

    it('漢字のメンションを抽出', () => {
      const text = '@田中太郎 さんこんにちは';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].username).toBe('田中太郎');
    });

    it('混合文字のメンションを抽出', () => {
      const text = '@user123_田中 さん';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].username).toBe('user123_田中');
    });

    it('メールアドレスの@は無視', () => {
      const text = 'Contact us at email@example.com';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(0);
    });

    it('文末のメンションを抽出', () => {
      const text = 'Thanks @user';
      const mentions = extractMentions(text);

      expect(mentions).toHaveLength(1);
      expect(mentions[0].username).toBe('user');
    });
  });

  describe('convertMentionsToHTML', () => {
    it('メンションをHTMLリンクに変換', () => {
      const text = 'Hello @user1!';
      const mentions = [
        {
          userId: '123',
          username: 'user1',
          position: { start: 6, end: 12 },
          text: '@user1',
        },
      ];

      const html = convertMentionsToHTML(text, mentions);

      expect(html).toContain('<a href="/users/user1"');
      expect(html).toContain('class="mention-link"');
      expect(html).toContain('data-user-id="123"');
      expect(html).toContain('data-username="user1"');
      expect(html).toContain('>@user1</a>');
    });

    it('複数のメンションを変換', () => {
      const text = '@user1 and @user2';
      const mentions = [
        {
          username: 'user1',
          position: { start: 0, end: 6 },
          text: '@user1',
        },
        {
          username: 'user2',
          position: { start: 11, end: 17 },
          text: '@user2',
        },
      ];

      const html = convertMentionsToHTML(text, mentions);

      expect(html).toContain('@user1</a>');
      expect(html).toContain('@user2</a>');
    });

    it('HTMLエスケープを適用', () => {
      const text = '<script>alert("XSS")</script> @user';
      const mentions = [
        {
          username: 'user',
          position: { start: 30, end: 35 },
          text: '@user',
        },
      ];

      const html = convertMentionsToHTML(text, mentions);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('@user</a>');
    });

    it('カスタムCSSクラスを適用', () => {
      const text = '@user';
      const mentions = [
        {
          username: 'user',
          position: { start: 0, end: 5 },
          text: '@user',
        },
      ];

      const html = convertMentionsToHTML(text, mentions, 'custom-mention');

      expect(html).toContain('class="custom-mention"');
    });
  });

  describe('segmentTextWithMentions', () => {
    it('テキストをセグメントに分割', () => {
      const text = 'Hello @user1 and @user2!';
      const mentions = [
        {
          username: 'user1',
          position: { start: 6, end: 12 },
          text: '@user1',
        },
        {
          username: 'user2',
          position: { start: 17, end: 23 },
          text: '@user2',
        },
      ];

      const segments = segmentTextWithMentions(text, mentions);

      expect(segments).toHaveLength(5);
      expect(segments[0]).toEqual({ type: 'text', content: 'Hello ' });
      expect(segments[1]).toEqual({
        type: 'mention',
        content: '@user1',
        mention: mentions[0],
      });
      expect(segments[2]).toEqual({ type: 'text', content: ' and ' });
      expect(segments[3]).toEqual({
        type: 'mention',
        content: '@user2',
        mention: mentions[1],
      });
      expect(segments[4]).toEqual({ type: 'text', content: '!' });
    });

    it('メンションで始まるテキスト', () => {
      const text = '@user hello';
      const mentions = [
        {
          username: 'user',
          position: { start: 0, end: 5 },
          text: '@user',
        },
      ];

      const segments = segmentTextWithMentions(text, mentions);

      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('mention');
      expect(segments[1].type).toBe('text');
    });

    it('メンションで終わるテキスト', () => {
      const text = 'hello @user';
      const mentions = [
        {
          username: 'user',
          position: { start: 6, end: 11 },
          text: '@user',
        },
      ];

      const segments = segmentTextWithMentions(text, mentions);

      expect(segments).toHaveLength(2);
      expect(segments[0].type).toBe('text');
      expect(segments[1].type).toBe('mention');
    });

    it('メンションがない場合', () => {
      const text = 'Hello world!';
      const segments = segmentTextWithMentions(text, []);

      expect(segments).toHaveLength(1);
      expect(segments[0]).toEqual({ type: 'text', content: text });
    });
  });

  describe('validateMentions', () => {
    it('有効なメンション', () => {
      const mentions = [
        {
          username: 'user1',
          position: { start: 0, end: 6 },
          text: '@user1',
        },
        {
          username: 'user2',
          position: { start: 7, end: 13 },
          text: '@user2',
        },
      ];

      const result = validateMentions(mentions);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('最大メンション数を超過', () => {
      const mentions = Array.from({ length: 11 }, (_, i) => ({
        username: `user${i}`,
        position: { start: 0, end: 0 },
        text: `@user${i}`,
      }));

      const result = validateMentions(mentions, 10);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('メンションは最大10個までです');
    });

    it('重複したユーザー名', () => {
      const mentions = [
        {
          username: 'user1',
          position: { start: 0, end: 6 },
          text: '@user1',
        },
        {
          username: 'user1',
          position: { start: 7, end: 13 },
          text: '@user1',
        },
      ];

      const result = validateMentions(mentions);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('同じユーザーを複数回メンションすることはできません');
    });

    it('無効なユーザー名', () => {
      const mentions = [
        {
          username: 'user@invalid',
          position: { start: 0, end: 0 },
          text: '@user@invalid',
        },
      ];

      const result = validateMentions(mentions);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('無効なユーザー名');
    });
  });

  describe('isValidUsername', () => {
    it('有効な英数字ユーザー名', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('john_doe')).toBe(true);
      expect(isValidUsername('User_123')).toBe(true);
    });

    it('有効な日本語ユーザー名', () => {
      expect(isValidUsername('田中')).toBe(true);
      expect(isValidUsername('たなか')).toBe(true);
      expect(isValidUsername('タナカ')).toBe(true);
      expect(isValidUsername('田中太郎')).toBe(true);
    });

    it('有効な混合ユーザー名', () => {
      expect(isValidUsername('user_田中')).toBe(true);
      expect(isValidUsername('たなか123')).toBe(true);
    });

    it('無効なユーザー名（長さ）', () => {
      expect(isValidUsername('')).toBe(false);
      expect(isValidUsername('a'.repeat(31))).toBe(false);
    });

    it('無効なユーザー名（文字）', () => {
      expect(isValidUsername('user@domain')).toBe(false);
      expect(isValidUsername('user space')).toBe(false);
      expect(isValidUsername('user!name')).toBe(false);
    });
  });

  describe('sanitizeMentionText', () => {
    it('HTMLタグを除去', () => {
      const text = '<script>alert("XSS")</script>@user';
      const sanitized = sanitizeMentionText(text);

      expect(sanitized).toBe('scriptalert("XSS")/script@user');
    });

    it('JavaScriptプロトコルを除去', () => {
      const text = 'javascript:alert("XSS")';
      const sanitized = sanitizeMentionText(text);

      expect(sanitized).toBe('alert("XSS")');
    });

    it('イベントハンドラを除去', () => {
      const text = 'onclick=alert("XSS")';
      const sanitized = sanitizeMentionText(text);

      expect(sanitized).toBe('alert("XSS")');
    });

    it('通常のテキストは変更しない', () => {
      const text = '@user1 Hello world!';
      const sanitized = sanitizeMentionText(text);

      expect(sanitized).toBe(text);
    });
  });

  describe('createDisplayText', () => {
    it('メンションを含むテキストをそのまま返す', () => {
      const text = 'Hello @user1 and @user2!';
      const mentions = [
        {
          username: 'user1',
          position: { start: 6, end: 12 },
          text: '@user1',
        },
        {
          username: 'user2',
          position: { start: 17, end: 23 },
          text: '@user2',
        },
      ];

      const displayText = createDisplayText(text, mentions);

      expect(displayText).toBe(text);
    });
  });
});
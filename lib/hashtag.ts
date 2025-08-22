/**
 * ハッシュタグ抽出と処理のユーティリティ関数
 */

/**
 * テキストからハッシュタグを抽出
 * 日本語、英語、絵文字、数字を含むハッシュタグに対応
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];
  
  // ハッシュタグのパターン
  // #の後に続く文字（空白、改行、特殊記号以外）を抽出
  const hashtagRegex = /#([^\s\n\r\t#@!$%^&*()+=\[\]{};:'"\\|,.<>/?`~]+)/gu;
  
  const matches = text.matchAll(hashtagRegex);
  const hashtags = new Set<string>();
  
  for (const match of matches) {
    const tag = match[1];
    // 空文字や数字のみのタグは除外
    if (tag && !/^\d+$/.test(tag)) {
      // 小文字に統一して格納
      hashtags.add(tag.toLowerCase());
    }
  }
  
  return Array.from(hashtags);
}

/**
 * テキスト内のハッシュタグをリンクに変換
 */
export function linkifyHashtags(text: string): string {
  if (!text) return '';
  
  const hashtagRegex = /#([^\s\n\r\t#@!$%^&*()+=\[\]{};:'"\\|,.<>/?`~]+)/gu;
  
  return text.replace(hashtagRegex, (match, tag) => {
    const encodedTag = encodeURIComponent(tag.toLowerCase());
    return `<a href="/search?tag=${encodedTag}" class="hashtag">${match}</a>`;
  });
}

/**
 * ハッシュタグをReactコンポーネント用に分割
 */
export function parseHashtags(text: string): Array<{ type: 'text' | 'hashtag', value: string }> {
  if (!text) return [{ type: 'text', value: '' }];
  
  const hashtagRegex = /#([^\s\n\r\t#@!$%^&*()+=\[\]{};:'"\\|,.<>/?`~]+)/gu;
  const parts: Array<{ type: 'text' | 'hashtag', value: string }> = [];
  let lastIndex = 0;
  let match;
  
  while ((match = hashtagRegex.exec(text)) !== null) {
    // ハッシュタグ前のテキスト
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: text.slice(lastIndex, match.index)
      });
    }
    
    // ハッシュタグ
    parts.push({
      type: 'hashtag',
      value: match[0] // #を含む完全なハッシュタグ
    });
    
    lastIndex = match.index + match[0].length;
  }
  
  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      value: text.slice(lastIndex)
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', value: text }];
}

/**
 * 入力中のハッシュタグを検出
 */
export function getCurrentHashtag(text: string, cursorPosition: number): string | null {
  if (!text || cursorPosition < 0) return null;
  
  // カーソル位置から前方向に#を探す
  let hashIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '#') {
      hashIndex = i;
      break;
    }
    // 空白や改行があったら中断
    if (/[\s\n\r\t]/.test(text[i])) {
      break;
    }
  }
  
  if (hashIndex === -1) return null;
  
  // #から現在のカーソル位置までの文字列を取得
  const hashtagPart = text.slice(hashIndex + 1, cursorPosition);
  
  // 有効なハッシュタグの一部かチェック
  if (hashtagPart && !/[\s\n\r\t#@!$%^&*()+=\[\]{};:'"\\|,.<>/?`~]/.test(hashtagPart)) {
    return hashtagPart.toLowerCase();
  }
  
  return null;
}

/**
 * ハッシュタグの使用頻度をカウント
 */
export function countHashtagFrequency(hashtags: string[]): Map<string, number> {
  const frequency = new Map<string, number>();
  
  for (const tag of hashtags) {
    const normalizedTag = tag.toLowerCase();
    frequency.set(normalizedTag, (frequency.get(normalizedTag) || 0) + 1);
  }
  
  return frequency;
}

/**
 * 人気のハッシュタグをソート
 */
export function sortHashtagsByPopularity(
  hashtags: Array<{ name: string; count: number }>
): Array<{ name: string; count: number }> {
  return hashtags.sort((a, b) => b.count - a.count);
}
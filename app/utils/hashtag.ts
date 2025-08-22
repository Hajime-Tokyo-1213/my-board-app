/**
 * Unicode対応のハッシュタグ処理ユーティリティ
 * 日本語、英語、絵文字、その他のUnicode文字に対応
 */

/**
 * Unicode文字プロパティを使用したハッシュタグ抽出
 * XID_Continue: プログラミング言語の識別子として継続可能な文字
 * これにより、日本語、中国語、韓国語、アラビア語などを含む多言語対応
 */
export function extractHashtags(text: string): string[] {
  if (!text) return [];

  // Unicode対応の正規表現パターン
  // \p{L}: すべての文字（Letter）
  // \p{N}: すべての数字（Number）
  // \p{M}: 結合文字（Mark）- アクセント記号など
  // \p{Emoji}: 絵文字
  // \p{Emoji_Component}: 絵文字の構成要素
  const hashtagPattern = /#([\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}][\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}_]*)/gu;
  
  const matches = text.matchAll(hashtagPattern);
  const hashtags = new Set<string>();
  
  for (const match of matches) {
    const tag = match[1];
    // 空文字、数字のみ、アンダースコアのみは除外
    if (tag && !/^[\d_]+$/.test(tag)) {
      // 正規化（NFCで統一）して小文字化
      const normalizedTag = tag.normalize('NFC').toLowerCase();
      hashtags.add(normalizedTag);
    }
  }
  
  return Array.from(hashtags);
}

/**
 * ハッシュタグの頻度をカウント
 */
export interface HashtagCount {
  tag: string;
  count: number;
  lastUsed: Date;
}

export class HashtagTracker {
  private static instance: HashtagTracker;
  private tagCounts: Map<string, HashtagCount> = new Map();

  private constructor() {}

  static getInstance(): HashtagTracker {
    if (!HashtagTracker.instance) {
      HashtagTracker.instance = new HashtagTracker();
    }
    return HashtagTracker.instance;
  }

  /**
   * ハッシュタグを記録
   */
  recordTag(tag: string): void {
    const normalizedTag = tag.normalize('NFC').toLowerCase();
    const existing = this.tagCounts.get(normalizedTag);
    
    if (existing) {
      existing.count++;
      existing.lastUsed = new Date();
    } else {
      this.tagCounts.set(normalizedTag, {
        tag: normalizedTag,
        count: 1,
        lastUsed: new Date()
      });
    }
  }

  /**
   * 複数のハッシュタグを記録
   */
  recordTags(tags: string[]): void {
    tags.forEach(tag => this.recordTag(tag));
  }

  /**
   * 人気のハッシュタグを取得
   */
  getPopularTags(limit: number = 10): HashtagCount[] {
    return Array.from(this.tagCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * 最近使用されたハッシュタグを取得
   */
  getRecentTags(limit: number = 10): HashtagCount[] {
    return Array.from(this.tagCounts.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, limit);
  }

  /**
   * タグの検索（前方一致）
   */
  searchTags(query: string, limit: number = 5): HashtagCount[] {
    const normalizedQuery = query.normalize('NFC').toLowerCase();
    return Array.from(this.tagCounts.values())
      .filter(item => item.tag.startsWith(normalizedQuery))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

/**
 * テキスト内のハッシュタグをリンク付きのReact要素として返す
 */
export interface ParsedText {
  type: 'text' | 'hashtag';
  value: string;
  key: string;
}

export function parseTextWithHashtags(text: string): ParsedText[] {
  if (!text) return [{ type: 'text', value: '', key: '0' }];
  
  const hashtagPattern = /#([\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}][\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}_]*)/gu;
  const parts: ParsedText[] = [];
  let lastIndex = 0;
  let keyIndex = 0;
  
  for (const match of text.matchAll(hashtagPattern)) {
    const matchIndex = match.index!;
    
    // ハッシュタグ前のテキスト
    if (matchIndex > lastIndex) {
      parts.push({
        type: 'text',
        value: text.slice(lastIndex, matchIndex),
        key: `text-${keyIndex++}`
      });
    }
    
    // ハッシュタグ
    parts.push({
      type: 'hashtag',
      value: match[0],
      key: `tag-${keyIndex++}`
    });
    
    lastIndex = matchIndex + match[0].length;
  }
  
  // 残りのテキスト
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      value: text.slice(lastIndex),
      key: `text-${keyIndex++}`
    });
  }
  
  return parts.length > 0 ? parts : [{ type: 'text', value: text, key: '0' }];
}

/**
 * 入力中のハッシュタグを検出（カーソル位置ベース）
 */
export function getCurrentHashtagAtCursor(
  text: string,
  cursorPosition: number
): { tag: string; startIndex: number } | null {
  if (!text || cursorPosition < 0 || cursorPosition > text.length) {
    return null;
  }

  // カーソル位置から前方向に#を探す
  let hashIndex = -1;
  for (let i = cursorPosition - 1; i >= 0; i--) {
    if (text[i] === '#') {
      hashIndex = i;
      break;
    }
    // 空白、改行、別のハッシュタグに遭遇したら中断
    if (/[\s\n\r\t#]/.test(text[i])) {
      break;
    }
  }

  if (hashIndex === -1) return null;

  // #から現在のカーソル位置までの文字列を取得
  const tagPart = text.slice(hashIndex + 1, cursorPosition);
  
  // Unicode文字パターンでチェック
  const validTagPattern = /^[\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}][\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}_]*$/u;
  
  if (tagPart && (tagPart === '' || validTagPattern.test(tagPart))) {
    return {
      tag: tagPart.normalize('NFC').toLowerCase(),
      startIndex: hashIndex
    };
  }

  return null;
}

/**
 * ハッシュタグの正規化
 * 表示用と検索用で統一フォーマット
 */
export function normalizeHashtag(tag: string): string {
  // #を除去し、正規化して小文字に
  const cleaned = tag.replace(/^#/, '');
  return cleaned.normalize('NFC').toLowerCase();
}

/**
 * ハッシュタグのバリデーション
 */
export function isValidHashtag(tag: string): boolean {
  if (!tag || tag.length < 2) return false; // 最低2文字（#と1文字）
  
  const withoutHash = tag.replace(/^#/, '');
  if (!withoutHash) return false;
  
  // Unicode文字パターンでチェック
  const validPattern = /^[\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}][\p{L}\p{N}\p{M}\p{Emoji}\p{Emoji_Component}_]*$/u;
  
  // 数字のみ、アンダースコアのみは無効
  if (/^[\d_]+$/.test(withoutHash)) return false;
  
  return validPattern.test(withoutHash);
}

/**
 * ハッシュタグの文字数制限（絵文字を考慮）
 */
export function getHashtagLength(tag: string): number {
  const withoutHash = tag.replace(/^#/, '');
  // 絵文字を1文字として数える
  return Array.from(withoutHash).length;
}

/**
 * ハッシュタグを検索用URLに変換
 */
export function createHashtagSearchUrl(tag: string): string {
  const normalized = normalizeHashtag(tag);
  return `/search?tag=${encodeURIComponent(normalized)}`;
}

/**
 * 複数のハッシュタグでAND/OR検索用のURLを生成
 */
export function createMultiHashtagSearchUrl(
  tags: string[],
  operator: 'AND' | 'OR' = 'OR'
): string {
  const normalized = tags.map(normalizeHashtag);
  const params = new URLSearchParams();
  params.set('tags', normalized.join(','));
  params.set('op', operator);
  return `/search?${params.toString()}`;
}
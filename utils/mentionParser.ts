export interface ParsedMention {
  userId?: string;
  username: string;
  position: {
    start: number;
    end: number;
  };
  text: string;
}

export interface MentionParseResult {
  mentions: ParsedMention[];
  displayText: string;
  htmlText: string;
}

/**
 * テキストからメンションを抽出
 * @param text 解析するテキスト
 * @returns 抽出されたメンション配列
 */
export function extractMentions(text: string): ParsedMention[] {
  const mentions: ParsedMention[] = [];
  
  // 日本語を含むユーザー名にも対応した正規表現
  // @の後に英数字、日本語（ひらがな、カタカナ、漢字）、アンダースコアが続くパターン
  const mentionRegex = /@([a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+)/g;
  
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
      text: match[0],
    });
  }
  
  return mentions;
}

/**
 * メンションを含むテキストをHTMLに変換
 * @param text 元のテキスト
 * @param mentions メンション情報配列
 * @param linkClass メンションリンクに適用するCSSクラス
 * @returns HTML文字列
 */
export function convertMentionsToHTML(
  text: string,
  mentions: ParsedMention[],
  linkClass: string = 'mention-link'
): string {
  if (!mentions || mentions.length === 0) {
    return escapeHtml(text);
  }
  
  // メンションを位置順にソート（後ろから処理するため降順）
  const sortedMentions = [...mentions].sort((a, b) => b.position.start - a.position.start);
  
  let result = text;
  
  for (const mention of sortedMentions) {
    const before = result.substring(0, mention.position.start);
    const after = result.substring(mention.position.end);
    
    const mentionLink = `<a href="/users/${mention.username}" class="${linkClass}" data-user-id="${mention.userId || ''}" data-username="${mention.username}">@${mention.username}</a>`;
    
    result = before + mentionLink + after;
  }
  
  // 残りのテキストをエスケープ
  return escapeHtmlExceptTags(result);
}

/**
 * メンションをReact要素として表示するためのデータを生成
 * @param text 元のテキスト
 * @param mentions メンション情報配列
 * @returns セグメント化されたテキスト配列
 */
export function segmentTextWithMentions(
  text: string,
  mentions: ParsedMention[]
): Array<{ type: 'text' | 'mention'; content: string; mention?: ParsedMention }> {
  if (!mentions || mentions.length === 0) {
    return [{ type: 'text', content: text }];
  }
  
  const segments: Array<{ type: 'text' | 'mention'; content: string; mention?: ParsedMention }> = [];
  const sortedMentions = [...mentions].sort((a, b) => a.position.start - b.position.start);
  
  let lastEnd = 0;
  
  for (const mention of sortedMentions) {
    // メンション前のテキスト
    if (mention.position.start > lastEnd) {
      segments.push({
        type: 'text',
        content: text.substring(lastEnd, mention.position.start),
      });
    }
    
    // メンション
    segments.push({
      type: 'mention',
      content: text.substring(mention.position.start, mention.position.end),
      mention,
    });
    
    lastEnd = mention.position.end;
  }
  
  // 最後のメンション後のテキスト
  if (lastEnd < text.length) {
    segments.push({
      type: 'text',
      content: text.substring(lastEnd),
    });
  }
  
  return segments;
}

/**
 * メンションの検証
 * @param mentions メンション配列
 * @param maxMentions 最大メンション数
 * @returns 検証結果
 */
export function validateMentions(
  mentions: ParsedMention[],
  maxMentions: number = 10
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (mentions.length > maxMentions) {
    errors.push(`メンションは最大${maxMentions}個までです`);
  }
  
  // 重複チェック
  const uniqueUsernames = new Set(mentions.map(m => m.username));
  if (uniqueUsernames.size < mentions.length) {
    errors.push('同じユーザーを複数回メンションすることはできません');
  }
  
  // ユーザー名の形式チェック
  const invalidUsernames = mentions.filter(m => !isValidUsername(m.username));
  if (invalidUsernames.length > 0) {
    errors.push(`無効なユーザー名: ${invalidUsernames.map(m => m.username).join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * ユーザー名の妥当性をチェック
 * @param username ユーザー名
 * @returns 妥当な場合true
 */
export function isValidUsername(username: string): boolean {
  // ユーザー名の長さチェック（1-30文字）
  if (username.length < 1 || username.length > 30) {
    return false;
  }
  
  // 使用可能な文字のチェック（英数字、日本語、アンダースコア）
  const validUsernameRegex = /^[a-zA-Z0-9_\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/;
  return validUsernameRegex.test(username);
}

/**
 * メンションを含むテキストから表示用テキストを生成
 * @param text 元のテキスト
 * @param mentions メンション情報配列
 * @returns 表示用テキスト
 */
export function createDisplayText(text: string, mentions: ParsedMention[]): string {
  // メンションはそのまま@usernameの形式で表示
  return text;
}

/**
 * HTMLエスケープ
 * @param text エスケープするテキスト
 * @returns エスケープ済みテキスト
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * HTMLタグ以外をエスケープ
 * @param text エスケープするテキスト
 * @returns エスケープ済みテキスト（<a>タグは保持）
 */
function escapeHtmlExceptTags(text: string): string {
  // <a>タグとその内容を一時的に置換
  const placeholders: string[] = [];
  let placeholderIndex = 0;
  
  const textWithPlaceholders = text.replace(/<a[^>]*>.*?<\/a>/g, (match) => {
    const placeholder = `__PLACEHOLDER_${placeholderIndex}__`;
    placeholders[placeholderIndex] = match;
    placeholderIndex++;
    return placeholder;
  });
  
  // 残りのテキストをエスケープ
  const escapedText = escapeHtml(textWithPlaceholders);
  
  // プレースホルダーを元に戻す
  let result = escapedText;
  placeholders.forEach((content, index) => {
    result = result.replace(`__PLACEHOLDER_${index}__`, content);
  });
  
  return result;
}

/**
 * メンションテキストをサニタイズ
 * @param text サニタイズするテキスト
 * @returns サニタイズ済みテキスト
 */
export function sanitizeMentionText(text: string): string {
  // XSS対策のためのサニタイズ
  return text
    .replace(/[<>]/g, '') // HTMLタグを除去
    .replace(/javascript:/gi, '') // JavaScriptプロトコルを除去
    .replace(/on\w+=/gi, ''); // イベントハンドラを除去
}
import DOMPurify from 'isomorphic-dompurify';

/**
 * XSS対策のための入力値サニタイゼーション
 */

// 許可するHTMLタグ（基本的にはなし）
const ALLOWED_TAGS: string[] = [];

// 許可する属性（基本的にはなし）
const ALLOWED_ATTR: string[] = [];

/**
 * HTMLをサニタイズ（すべてのHTMLタグを削除）
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    KEEP_CONTENT: true, // タグの中身は保持
  });
}

/**
 * プレーンテキストとしてサニタイズ
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // HTMLエンティティをエスケープ
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
    // スラッシュ(/)のエスケープは削除 - 投稿内容では不要
}

/**
 * SQLインジェクション対策（MongoDBクエリ用）
 */
export function sanitizeMongoQuery(input: any): any {
  if (typeof input !== 'object' || input === null) {
    return input;
  }
  
  // $で始まるキーを削除（MongoDBのオペレータ）
  const sanitized: any = {};
  for (const key in input) {
    if (!key.startsWith('$')) {
      sanitized[key] = input[key];
    }
  }
  
  return sanitized;
}

/**
 * ファイル名のサニタイズ
 */
export function sanitizeFileName(fileName: string): string {
  if (typeof fileName !== 'string') {
    return 'file';
  }
  
  // 危険な文字を削除または置換
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 英数字、ピリオド、アンダースコア、ハイフン以外を置換
    .replace(/\.{2,}/g, '_') // 連続するピリオドを置換
    .replace(/^\./, '_') // 先頭のピリオドを置換
    .slice(0, 255); // 最大255文字
}

/**
 * URLのサニタイズ
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') {
    return '';
  }
  
  // JavaScriptスキームを防ぐ
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];
  
  const lowerUrl = url.toLowerCase().trim();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  // 相対URLまたはhttpスキームのみ許可
  if (
    url.startsWith('/') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  ) {
    return url;
  }
  
  return '';
}

/**
 * 投稿内容のサニタイゼーション
 */
export interface SanitizedPost {
  title: string;
  content: string;
}

export function sanitizePostInput(
  title: string,
  content: string
): SanitizedPost {
  return {
    title: sanitizeText(title).trim(),
    content: sanitizeText(content).trim(),
  };
}

/**
 * ユーザー入力のサニタイゼーション
 */
export interface SanitizedUser {
  name: string;
  email: string;
}

export function sanitizeUserInput(
  name: string,
  email: string
): SanitizedUser {
  return {
    name: sanitizeText(name).trim(),
    email: sanitizeText(email).trim().toLowerCase(),
  };
}

/**
 * 検索クエリのサニタイゼーション
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') {
    return '';
  }
  
  // 特殊文字をエスケープ
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // 正規表現の特殊文字をエスケープ
    .trim()
    .slice(0, 100); // 最大100文字
}

/**
 * JSONのサニタイゼーション（XSSを防ぐ）
 */
export function sanitizeJson(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeJson);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      // キー名もサニタイズ
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeJson(obj[key]);
    }
    return sanitized;
  }
  
  return obj;
}
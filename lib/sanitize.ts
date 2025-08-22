import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML/XSS攻撃を防ぐためのサニタイズ関数
 */
export function sanitizeInput(input: string): string {
  // DOMPurifyでHTMLタグを除去
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [], // すべてのHTMLタグを除去
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  });
  
  // 追加のサニタイゼーション
  return cleaned
    .trim()
    .replace(/[<>]/g, '') // 念のため<>を削除
    .replace(/javascript:/gi, '') // javascript:スキームを削除
    .replace(/on\w+\s*=/gi, ''); // onclickなどのイベントハンドラを削除
}

/**
 * MongoDBインジェクション対策
 */
export function sanitizeMongoQuery(query: any): any {
  if (typeof query === 'string') {
    // $で始まる演算子を削除
    return query.replace(/^\$/, '');
  }
  
  if (typeof query === 'object' && query !== null) {
    const sanitized: any = {};
    for (const key in query) {
      // $で始まるキーを除外
      if (!key.startsWith('$')) {
        sanitized[key] = sanitizeMongoQuery(query[key]);
      }
    }
    return sanitized;
  }
  
  return query;
}

/**
 * コメント用のバリデーション
 */
export function validateComment(content: string): {
  isValid: boolean;
  error?: string;
  sanitized?: string;
} {
  // 空チェック
  if (!content || content.trim().length === 0) {
    return {
      isValid: false,
      error: 'コメントを入力してください'
    };
  }
  
  // 長さチェック
  if (content.length > 500) {
    return {
      isValid: false,
      error: 'コメントは500文字以内で入力してください'
    };
  }
  
  // 最小長チェック
  if (content.trim().length < 1) {
    return {
      isValid: false,
      error: 'コメントは1文字以上入力してください'
    };
  }
  
  // サニタイズ
  const sanitized = sanitizeInput(content);
  
  // サニタイズ後も内容があるかチェック
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: '有効なコメントを入力してください'
    };
  }
  
  return {
    isValid: true,
    sanitized
  };
}
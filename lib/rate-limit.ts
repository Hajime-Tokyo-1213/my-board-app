import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';

// レート制限の設定
export interface RateLimitConfig {
  window: number;  // 時間窓（ミリ秒）
  max: number;     // 最大リクエスト数
}

// デフォルトのレート制限設定
export const rateLimits = {
  // API全体
  global: { window: 60000, max: 60 },      // 1分間に60リクエスト
  
  // 認証関連
  auth: { window: 60000, max: 5 },         // 1分間に5回
  
  // 投稿作成
  createPost: { window: 60000, max: 5 },   // 1分間に5投稿
  
  // 投稿更新
  updatePost: { window: 60000, max: 10 },  // 1分間に10回
  
  // いいね
  like: { window: 60000, max: 30 },        // 1分間に30回
  
  // 削除操作
  delete: { window: 60000, max: 5 }        // 1分間に5回
};

// レート制限用のキャッシュ
const rateLimitCache = new LRUCache<string, number[]>({
  max: 5000, // 最大5000個のキーを保存
  ttl: 60000 * 5, // 5分間でエントリを自動削除
});

/**
 * IPアドレスを取得
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  if (cfIp) return cfIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;
  
  return '127.0.0.1';
}

/**
 * レート制限をチェック
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowStart = now - config.window;
  
  // 現在の記録を取得
  let timestamps = rateLimitCache.get(identifier) || [];
  
  // 時間窓外の古いタイムスタンプを削除
  timestamps = timestamps.filter(ts => ts > windowStart);
  
  // リクエスト数をチェック
  const allowed = timestamps.length < config.max;
  const remaining = Math.max(0, config.max - timestamps.length);
  
  if (allowed) {
    // 新しいタイムスタンプを追加
    timestamps.push(now);
    rateLimitCache.set(identifier, timestamps);
  }
  
  // リセット時刻を計算（最も古いタイムスタンプ + window）
  const resetAt = timestamps.length > 0 
    ? timestamps[0] + config.window 
    : now + config.window;
  
  return { allowed, remaining, resetAt };
}

/**
 * レート制限ミドルウェア
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  config: RateLimitConfig,
  identifier?: string
): Promise<NextResponse | null> {
  // テスト環境または特定の環境変数が設定されている場合はスキップ
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
    return null;
  }
  
  // 識別子の決定（デフォルトはIPアドレス）
  const id = identifier || getClientIp(request);
  const key = `${request.nextUrl.pathname}:${id}`;
  
  // レート制限をチェック
  const { allowed, remaining, resetAt } = checkRateLimit(key, config);
  
  if (!allowed) {
    // レート制限に達した場合
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'レート制限に達しました。しばらく待ってから再試行してください。',
        resetAt: new Date(resetAt).toISOString()
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetAt.toString(),
          'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString()
        }
      }
    );
  }
  
  // レート制限内の場合はnullを返す（処理を続行）
  return null;
}

/**
 * レート制限情報をレスポンスヘッダーに追加
 */
export function addRateLimitHeaders(
  response: NextResponse,
  config: RateLimitConfig,
  remaining: number,
  resetAt: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', config.max.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetAt.toString());
  return response;
}
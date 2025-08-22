import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitMiddleware, rateLimits, getClientIp } from '@/lib/rate-limit';

// セキュリティヘッダーの設定
function setSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https: blob:;
    font-src 'self' data: https://fonts.gstatic.com;
    connect-src 'self';
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  `.replace(/\s{2,}/g, ' ').trim();
  
  response.headers.set('Content-Security-Policy', cspHeader);
  
  // その他のセキュリティヘッダー
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // 本番環境でのみHTSを設定
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }
  
  return response;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 認証が不要なパス
  const publicPaths = [
    '/auth/signin',
    '/auth/register', 
    '/auth/error',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/new-password'
  ];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // 認証が不要なAPIエンドポイント
  const publicApiPaths = [
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/auth/[...nextauth]',
    '/api/csrf'
  ];
  
  // APIルートの処理
  if (pathname.startsWith('/api')) {
    // レート制限の適用
    let rateLimitConfig = rateLimits.global;
    
    // エンドポイント別のレート制限設定
    if (pathname.startsWith('/api/auth/')) {
      rateLimitConfig = rateLimits.auth;
    } else if (pathname === '/api/posts' && request.method === 'POST') {
      rateLimitConfig = rateLimits.createPost;
    } else if (pathname.match(/^\/api\/posts\/[^\/]+$/) && request.method === 'PUT') {
      rateLimitConfig = rateLimits.updatePost;
    } else if (pathname.match(/^\/api\/posts\/[^\/]+\/like$/)) {
      rateLimitConfig = rateLimits.like;
    } else if (request.method === 'DELETE') {
      rateLimitConfig = rateLimits.delete;
    }
    
    // レート制限チェック
    const rateLimitResponse = await rateLimitMiddleware(request, rateLimitConfig);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // NextAuthのエンドポイントは常に許可
    if (pathname.startsWith('/api/auth/')) {
      const response = NextResponse.next();
      return setSecurityHeaders(response);
    }
    
    const isPublicApi = publicApiPaths.some((path) => {
      return pathname.startsWith(path);
    });
    
    // 公開APIは認証チェックをスキップ
    if (isPublicApi) {
      const response = NextResponse.next();
      return setSecurityHeaders(response);
    }
    
    // それ以外のAPIは認証チェックを行う（APIルート内で実施）
    const response = NextResponse.next();
    return setSecurityHeaders(response);
  }

  // 公開パスは認証チェックをスキップ
  if (isPublicPath) {
    const response = NextResponse.next();
    return setSecurityHeaders(response);
  }

  // それ以外のページは認証チェックを行う（ページコンポーネント内で実施）
  const response = NextResponse.next();
  return setSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
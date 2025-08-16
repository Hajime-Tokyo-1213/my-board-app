#!/usr/bin/env node

/**
 * レート制限テストスクリプト
 * Usage: node scripts/test-rate-limit.js [auth|create-post|like]
 */

const testType = process.argv[2] || 'auth';

// テスト設定
const config = {
  auth: {
    url: 'http://localhost:3000/api/auth/signin',
    method: 'POST',
    data: { email: 'test@example.com', password: 'wrong' },
    limit: 5,
    description: '認証API（1分間に5回まで）'
  },
  'create-post': {
    url: 'http://localhost:3000/api/posts',
    method: 'POST',
    data: { title: 'Test Post', content: 'Test Content' },
    limit: 5,
    description: '投稿作成API（1分間に5投稿まで）',
    requireAuth: true
  },
  like: {
    url: 'http://localhost:3000/api/posts/test-id/like',
    method: 'POST',
    data: {},
    limit: 30,
    description: 'いいねAPI（1分間に30回まで）',
    requireAuth: true
  }
};

const test = config[testType];
if (!test) {
  console.error('Invalid test type. Use: auth, create-post, or like');
  process.exit(1);
}

console.log(`\n🔒 レート制限テスト: ${test.description}`);
console.log('='.repeat(60));

// Cookieを保存する変数
let cookies = '';

// ログイン関数
async function login() {
  try {
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test1234!'
      })
    });
    
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      cookies = setCookie;
      console.log('✅ ログイン成功\n');
      return true;
    }
  } catch (error) {
    console.error('❌ ログインエラー:', error.message);
  }
  return false;
}

// リクエスト送信関数
async function sendRequest(index) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (test.requireAuth && cookies) {
    headers['Cookie'] = cookies;
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(test.url, {
      method: test.method,
      headers,
      body: JSON.stringify(test.data)
    });
    
    const responseTime = Date.now() - startTime;
    const rateLimitHeaders = {
      limit: response.headers.get('x-ratelimit-limit'),
      remaining: response.headers.get('x-ratelimit-remaining'),
      reset: response.headers.get('x-ratelimit-reset'),
      retryAfter: response.headers.get('retry-after')
    };
    
    let body = '';
    try {
      body = await response.text();
      if (body) {
        body = JSON.parse(body);
      }
    } catch (e) {
      // JSONパースエラーは無視
    }
    
    const statusIcon = response.status === 429 ? '🚫' : 
                       response.status >= 400 ? '⚠️' : '✅';
    
    console.log(`${statusIcon} リクエスト #${index}:`);
    console.log(`   ステータス: ${response.status} ${response.statusText}`);
    console.log(`   応答時間: ${responseTime}ms`);
    
    if (rateLimitHeaders.limit) {
      console.log(`   制限情報:`);
      console.log(`     - 制限値: ${rateLimitHeaders.limit}`);
      console.log(`     - 残り: ${rateLimitHeaders.remaining}`);
      if (rateLimitHeaders.retryAfter) {
        console.log(`     - 再試行まで: ${rateLimitHeaders.retryAfter}秒`);
      }
    }
    
    if (response.status === 429) {
      console.log(`   メッセージ: ${body.message || body.error || 'レート制限に達しました'}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error(`❌ リクエスト #${index} エラー:`, error.message);
    return false;
  }
}

// メインテスト関数
async function runTest() {
  // 認証が必要な場合はログイン
  if (test.requireAuth) {
    console.log('🔐 認証が必要なAPIです。ログイン中...');
    const loginSuccess = await login();
    if (!loginSuccess) {
      console.error('❌ ログインに失敗しました。テストを中止します。');
      return;
    }
  }
  
  console.log(`📊 ${test.limit + 2}回のリクエストを送信します...\n`);
  
  let blockedAt = null;
  
  for (let i = 1; i <= test.limit + 2; i++) {
    const success = await sendRequest(i);
    
    if (!success && !blockedAt) {
      blockedAt = i;
    }
    
    // レート制限に達した後は少し待つ
    if (blockedAt && i === blockedAt) {
      console.log(`\n⏰ レート制限に達しました（${blockedAt}回目）`);
      
      // リセット時間を待つかどうか確認
      console.log('\n💡 ヒント: 1分待ってから再実行すると、制限がリセットされます。');
    }
    
    // 次のリクエストまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // テスト結果のサマリー
  console.log('\n' + '='.repeat(60));
  console.log('📋 テスト結果サマリー:');
  console.log(`   - 設定された制限: ${test.limit}回`);
  console.log(`   - レート制限発動: ${blockedAt ? `${blockedAt}回目` : 'なし'}`);
  
  if (blockedAt === test.limit + 1) {
    console.log('   - 結果: ✅ 正常（期待通りの動作）');
  } else if (!blockedAt) {
    console.log('   - 結果: ⚠️ レート制限が機能していない可能性');
  } else {
    console.log(`   - 結果: ⚠️ 予期しないタイミングで制限（${blockedAt}回目）`);
  }
}

// テスト実行
runTest().catch(console.error);
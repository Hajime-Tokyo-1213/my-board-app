#!/usr/bin/env node

/**
 * XSS攻撃テストスクリプト
 * 様々なXSSペイロードをテストして防御が機能しているか確認
 */

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');

let sessionCookie = '';

// ログインしてクッキーを取得する関数
async function loginAndGetCookie() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error('テスト用の環境変数 TEST_USER_EMAIL と TEST_USER_PASSWORD を設定してください。');
  }

  try {
    // 1. CSRFトークンを取得
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';')[0] || '';

    // 2. ログインリクエスト
    const loginResponse = await fetch('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfCookie,
      },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        json: 'true',
      }),
    });

    if (!loginResponse.ok) {
      throw new Error(`ログインに失敗しました: ${loginResponse.statusText}`);
    }

    // 3. セッションクッキーを取得
    const cookies = loginResponse.headers.get('set-cookie');
    if (cookies) {
      // 複数のSet-Cookieヘッダーからセッションクッキーを抽出
      const sessionCookieEntry = cookies.split(',').find(c => c.trim().startsWith('next-auth.session-token'));
      if (sessionCookieEntry) {
        sessionCookie = sessionCookieEntry.split(';')[0];
        console.log(`${colors.green}✅ ログイン成功${colors.reset}`);
        return;
      }
    }
    throw new Error('セッションクッキーの取得に失敗しました。');
  } catch (error) {
    console.error(`${colors.red}❌ ログイン処理エラー: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// XSSテストケース
const xssPayloads = [
  // 基本的なスクリプトインジェクション
  {
    name: 'Basic Script Tag',
    payload: '<script>alert("XSS")</script>',
    description: '基本的なスクリプトタグ'
  },
  {
    name: 'Script with Document.Cookie',
    payload: '<script>document.cookie</script>',
    description: 'Cookieを狙うスクリプト'
  },
  
  // イベントハンドラー
  {
    name: 'IMG onerror',
    payload: '<img src=x onerror=alert("XSS")>',
    description: '画像のonerrorイベント'
  },
  {
    name: 'Body onload',
    payload: '<body onload=alert("XSS")>',
    description: 'bodyのonloadイベント'
  },
  {
    name: 'SVG onload',
    payload: '<svg onload=alert("XSS")>',
    description: 'SVGのonloadイベント'
  },
  
  // JavaScriptプロトコル
  {
    name: 'JavaScript Protocol',
    payload: '<a href="javascript:alert(1)">Click</a>',
    description: 'javascript:プロトコル'
  },
  {
    name: 'JavaScript in iframe',
    payload: '<iframe src="javascript:alert(1)"></iframe>',
    description: 'iframe内のJavaScript'
  },
  
  // データURL
  {
    name: 'Data URL',
    payload: '<img src="data:text/html,<script>alert(1)</script>">',
    description: 'データURLスキーム'
  },
  
  // エンコーディング回避
  {
    name: 'HTML Entity Encoding',
    payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    description: 'HTMLエンティティエンコーディング'
  },
  {
    name: 'Unicode Encoding',
    payload: '\u003Cscript\u003Ealert("XSS")\u003C/script\u003E',
    description: 'Unicodeエンコーディング'
  },
  
  // スタイルインジェクション
  {
    name: 'Style Injection',
    payload: '<style>body{display:none}</style>',
    description: 'CSSインジェクション'
  },
  {
    name: 'Style with Expression',
    payload: '<style>*{background:expression(alert("XSS"))}</style>',
    description: 'CSS Expression（IE用）'
  },
  
  // その他の攻撃ベクター
  {
    name: 'Meta Refresh',
    payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    description: 'metaタグリダイレクト'
  },
  {
    name: 'Object Tag',
    payload: '<object data="javascript:alert(1)"></object>',
    description: 'objectタグ'
  },
  {
    name: 'Embed Tag',
    payload: '<embed src="javascript:alert(1)">',
    description: 'embedタグ'
  }
];

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// テスト実行関数
async function testXSSPayload(payload, index) {
  console.log(`\n${colors.cyan}[テスト ${index}] ${payload.name}${colors.reset}`);
  console.log(`ペイロード: ${colors.yellow}${payload.payload}${colors.reset}`);
  console.log(`説明: ${payload.description}`);
  
  try {
    // APIに送信
    const response = await fetch('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        title: `XSS Test ${index}: ${payload.name}`,
        content: payload.payload
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      // 投稿が作成された場合、内容を確認
      console.log(`${colors.green}✅ 投稿作成成功${colors.reset}`);
      
      // サニタイズされた内容を確認
      if (result.data) {
        const sanitized = result.data.content;
        const isXSSBlocked = !sanitized.includes('<script') && 
                            !sanitized.includes('onerror=') &&
                            !sanitized.includes('javascript:');
        
        if (isXSSBlocked) {
          console.log(`${colors.green}✅ XSSペイロードが無害化されました${colors.reset}`);
          console.log(`サニタイズ後: ${sanitized.substring(0, 100)}...`);
        } else {
          console.log(`${colors.red}⚠️ 警告: XSSペイロードが残っている可能性${colors.reset}`);
          console.log(`内容: ${sanitized}`);
        }
      }
    } else {
      console.log(`${colors.yellow}⚠️ 投稿作成失敗: ${result.error}${colors.reset}`);
    }
    
    return response.ok;
  } catch (error) {
    console.log(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    return false;
  }
}

// HTMLでの表示確認
async function checkRendering() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📋 レンダリングチェック${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`
${colors.yellow}⚠️ 重要な確認事項:${colors.reset}

1. ブラウザで http://localhost:3000 を開く
2. 作成されたXSSテスト投稿を確認
3. 以下を確認:
   ${colors.green}✅${colors.reset} アラートが表示されない
   ${colors.green}✅${colors.reset} スクリプトが実行されない
   ${colors.green}✅${colors.reset} ページレイアウトが崩れない
   ${colors.green}✅${colors.reset} HTMLタグがエスケープされている

4. 開発者ツールのコンソールでエラーを確認
   ${colors.green}✅${colors.reset} XSS関連のエラーがない
   ${colors.green}✅${colors.reset} CSPブロックのメッセージが表示される場合がある
  `);
}

// メイン実行関数
async function runXSSTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🔒 XSS攻撃テスト開始${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  // まずログイン
  await loginAndGetCookie();
  
  console.log(`\n${xssPayloads.length}個のXSSペイロードをテストします...`);
  
  const results = {
    total: xssPayloads.length,
    blocked: 0,
    failed: 0
  };
  
  // 各ペイロードをテスト
  for (let i = 0; i < xssPayloads.length; i++) {
    const success = await testXSSPayload(xssPayloads[i], i + 1);
    if (success) {
      results.blocked++;
    } else {
      results.failed++;
    }
    
    // 次のテストまで少し待つ
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // 結果サマリー
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📊 テスト結果サマリー${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`
総テスト数: ${results.total}
ブロック成功: ${colors.green}${results.blocked}${colors.reset}
テスト失敗: ${colors.red}${results.failed}${colors.reset}

${results.blocked === results.total ? 
  `${colors.green}✅ すべてのXSSペイロードが正常に処理されました！${colors.reset}` :
  `${colors.yellow}⚠️ 一部のテストが失敗しました。詳細を確認してください。${colors.reset}`}
  `);
  
  // レンダリングチェックの案内
  await checkRendering();
}

// スクリプト実行
console.log(`${colors.yellow}
⚠️ 注意事項:
1. 開発サーバーが起動していることを確認してください（npm run dev）
2. テスト用の投稿が作成されます
3. テスト後は必要に応じて投稿を削除してください
${colors.reset}`);

// 実行確認
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('テストを開始しますか？ (y/n): ', (answer) => {
  rl.close();
  if (answer.toLowerCase() === 'y') {
    runXSSTests().catch(console.error);
  } else {
    console.log('テストをキャンセルしました。');
  }
});
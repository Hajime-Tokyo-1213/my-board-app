#!/usr/bin/env node

/**
 * 不正入力値バリデーションテストスクリプト
 * SQLインジェクション、特殊文字、境界値などのテスト
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
    const csrfResponse = await fetch('http://localhost:3000/api/auth/csrf');
    const { csrfToken } = await csrfResponse.json();
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';')[0] || '';

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

    const cookies = loginResponse.headers.get('set-cookie');
    if (cookies) {
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

// テストケース定義
const testCases = {
  // SQLインジェクション風の入力
  injection: [
    {
      name: 'SQL Injection - DROP',
      title: "'; DROP TABLE posts; --",
      content: "Normal content",
      description: 'SQLインジェクション（テーブル削除）'
    },
    {
      name: 'SQL Injection - OR',
      title: "1' OR '1'='1",
      content: "Normal content",
      description: 'SQLインジェクション（認証バイパス）'
    },
    {
      name: 'NoSQL Injection',
      title: '{"$ne": null}',
      content: "Normal content",
      description: 'NoSQLインジェクション'
    },
    {
      name: 'MongoDB Operator',
      title: 'Title with $where operator',
      content: '{"$where": "this.title == \'test\'"}',
      description: 'MongoDBオペレータインジェクション'
    }
  ],
  
  // テンプレートインジェクション
  template: [
    {
      name: 'Template Injection - JS',
      title: '${7*7}',
      content: '${process.env.MONGODB_URI}',
      description: 'JavaScriptテンプレートインジェクション'
    },
    {
      name: 'Template Injection - Angular',
      title: '{{7*7}}',
      content: '{{constructor.constructor("alert(1)")()}}',
      description: 'Angularテンプレートインジェクション'
    }
  ],
  
  // パストラバーサル
  pathTraversal: [
    {
      name: 'Path Traversal - Unix',
      title: '../../../etc/passwd',
      content: 'Content',
      description: 'Unixパストラバーサル'
    },
    {
      name: 'Path Traversal - Windows',
      title: '..\\..\\..\\windows\\system32\\config\\sam',
      content: 'Content',
      description: 'Windowsパストラバーサル'
    }
  ],
  
  // 特殊文字
  specialChars: [
    {
      name: 'Null Byte',
      title: 'Title with null\x00byte',
      content: 'Content with null\x00byte',
      description: 'Nullバイトインジェクション'
    },
    {
      name: 'Unicode - Zero Width',
      title: 'Title\u200Bwith\u200Czero\u200Dwidth',
      content: 'Content with zero width characters',
      description: 'ゼロ幅文字'
    },
    {
      name: 'Emoji Overload',
      title: '🔥💀🎃👻🤖🦄🌈✨',
      content: '絵文字😀😃😄😁😆😅🤣😂🙂🙃😉😊',
      description: '絵文字の大量使用'
    },
    {
      name: 'RTL Override',
      title: 'Test\u202Etxt.exe',
      content: 'Right-to-left override character',
      description: 'RTLオーバーライド文字'
    }
  ],
  
  // 文字数境界値
  boundary: [
    {
      name: 'Title - Exactly 100',
      title: 'a'.repeat(100),
      content: 'Content',
      description: 'タイトル100文字（境界値）'
    },
    {
      name: 'Title - 101 chars',
      title: 'a'.repeat(101),
      content: 'Content',
      description: 'タイトル101文字（超過）'
    },
    {
      name: 'Content - Exactly 1000',
      title: 'Title',
      content: 'a'.repeat(1000),
      description: '本文1000文字（境界値）'
    },
    {
      name: 'Content - 1001 chars',
      title: 'Title',
      content: 'a'.repeat(1001),
      description: '本文1001文字（超過）'
    },
    {
      name: 'Empty Title',
      title: '',
      content: 'Content',
      description: '空のタイトル'
    },
    {
      name: 'Empty Content',
      title: 'Title',
      content: '',
      description: '空の本文'
    },
    {
      name: 'Whitespace Only',
      title: '   ',
      content: '   \n\t  ',
      description: '空白文字のみ'
    }
  ],
  
  // エンコーディング攻撃
  encoding: [
    {
      name: 'URL Encoding',
      title: '%3Cscript%3Ealert%281%29%3C%2Fscript%3E',
      content: 'Content',
      description: 'URLエンコーディング'
    },
    {
      name: 'HTML Entity',
      title: '&lt;script&gt;alert(1)&lt;/script&gt;',
      content: 'Content',
      description: 'HTMLエンティティ'
    },
    {
      name: 'Unicode Escape',
      title: '\u003Cscript\u003Ealert(1)\u003C/script\u003E',
      content: 'Content',
      description: 'Unicodeエスケープ'
    }
  ]
};

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// テスト実行関数
async function runTest(category, test) {
  try {
    const response = await fetch('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie,
      },
      body: JSON.stringify({
        title: test.title,
        content: test.content
      })
    });
    
    const result = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      error: result.error,
      sanitized: result.data ? {
        title: result.data.title,
        content: result.data.content
      } : null
    };
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
      sanitized: null
    };
  }
}

// カテゴリーごとのテスト実行
async function runCategoryTests(categoryName, tests) {
  console.log(`\n${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.magenta}📁 ${categoryName.toUpperCase()}${colors.reset}`);
  console.log(`${colors.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const results = {
    passed: 0,
    failed: 0,
    blocked: 0
  };
  
  for (const test of tests) {
    console.log(`${colors.cyan}[テスト] ${test.name}${colors.reset}`);
    console.log(`説明: ${test.description}`);
    console.log(`入力タイトル: ${colors.yellow}${test.title.substring(0, 50)}${test.title.length > 50 ? '...' : ''}${colors.reset}`);
    console.log(`入力本文: ${colors.yellow}${test.content.substring(0, 50)}${test.content.length > 50 ? '...' : ''}${colors.reset}`);
    
    const result = await runTest(categoryName, test);
    
    if (result.success) {
      // 投稿が作成された = サニタイズされた
      console.log(`${colors.green}✅ 結果: 投稿作成成功（サニタイズ済み）${colors.reset}`);
      
      if (result.sanitized) {
        // サニタイズ前後の比較
        const titleChanged = result.sanitized.title !== test.title;
        const contentChanged = result.sanitized.content !== test.content;
        
        if (titleChanged || contentChanged) {
          console.log(`${colors.green}   サニタイズが適用されました:${colors.reset}`);
          if (titleChanged) {
            console.log(`   タイトル: ${result.sanitized.title.substring(0, 50)}`);
          }
          if (contentChanged) {
            console.log(`   本文: ${result.sanitized.content.substring(0, 50)}`);
          }
        }
      }
      results.passed++;
    } else if (result.status === 400) {
      // バリデーションエラー = 適切にブロック
      console.log(`${colors.yellow}⚠️ 結果: バリデーションエラー（${result.error}）${colors.reset}`);
      results.blocked++;
    } else {
      // その他のエラー
      console.log(`${colors.red}❌ 結果: エラー（${result.error}）${colors.reset}`);
      results.failed++;
    }
    
    console.log('');
    
    // 次のテストまで待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}

// メイン実行関数
async function runAllTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🔒 不正入力値バリデーションテスト${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  await loginAndGetCookie();
  
  const overallResults = {
    total: 0,
    passed: 0,
    failed: 0,
    blocked: 0
  };
  
  // 各カテゴリーのテストを実行
  for (const [categoryName, tests] of Object.entries(testCases)) {
    const results = await runCategoryTests(categoryName, tests);
    overallResults.total += tests.length;
    overallResults.passed += results.passed;
    overallResults.failed += results.failed;
    overallResults.blocked += results.blocked;
  }
  
  // 総合結果
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📊 テスト結果サマリー${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`総テスト数: ${overallResults.total}`);
  console.log(`${colors.green}✅ サニタイズ成功: ${overallResults.passed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️ 適切にブロック: ${overallResults.blocked}${colors.reset}`);
  console.log(`${colors.red}❌ エラー: ${overallResults.failed}${colors.reset}`);
  
  const successRate = ((overallResults.passed + overallResults.blocked) / overallResults.total * 100).toFixed(1);
  
  console.log(`\n成功率: ${successRate}%`);
  
  if (successRate === '100.0') {
    console.log(`${colors.green}🎉 すべての不正入力が適切に処理されました！${colors.reset}`);
  } else if (successRate >= 90) {
    console.log(`${colors.yellow}⚠️ ほとんどの不正入力は処理されていますが、改善の余地があります。${colors.reset}`);
  } else {
    console.log(`${colors.red}⚠️ バリデーションに問題があります。セキュリティの強化が必要です。${colors.reset}`);
  }
  
  // 推奨事項
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📝 セキュリティ推奨事項${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`1. ${colors.cyan}入力値の厳格な検証${colors.reset}`);
  console.log(`   • ホワイトリスト方式での文字制限`);
  console.log(`   • 正規表現による形式チェック`);
  
  console.log(`\n2. ${colors.cyan}出力時のエスケープ${colors.reset}`);
  console.log(`   • コンテキストに応じたエスケープ処理`);
  console.log(`   • ReactのデフォルトエスケープをOn`);
  
  console.log(`\n3. ${colors.cyan}データベースクエリの安全性${colors.reset}`);
  console.log(`   • パラメータ化クエリの使用`);
  console.log(`   • MongoDBオペレータの無効化`);
  
  console.log(`\n4. ${colors.cyan}定期的なセキュリティ監査${colors.reset}`);
  console.log(`   • 新しい攻撃手法への対応`);
  console.log(`   • 依存関係の脆弱性チェック`);
}

// スクリプト実行
console.log(`${colors.yellow}
⚠️ 注意事項:
1. 開発サーバーが起動していることを確認（npm run dev）
2. テスト用の投稿が作成される場合があります
3. テスト後は必要に応じて投稿を削除してください
${colors.reset}`);

runAllTests().catch(console.error);
#!/usr/bin/env node

/**
 * セキュリティヘッダー確認スクリプト
 * 必要なセキュリティヘッダーが正しく設定されているか確認
 */

// 確認すべきセキュリティヘッダー
const requiredHeaders = [
  {
    name: 'Content-Security-Policy',
    required: true,
    description: 'XSS攻撃やデータインジェクション攻撃を防ぐ',
    expectedPattern: /default-src/,
    checkPoints: [
      "default-src 'self'が含まれる",
      "script-srcが適切に設定されている",
      "frame-ancestors 'none'が含まれる"
    ]
  },
  {
    name: 'X-Frame-Options',
    required: true,
    description: 'クリックジャッキング攻撃を防ぐ',
    expectedValue: 'DENY',
    checkPoints: [
      "値がDENYまたはSAMEORIGIN",
      "外部サイトからのiframe埋め込みをブロック"
    ]
  },
  {
    name: 'X-Content-Type-Options',
    required: true,
    description: 'MIMEタイプスニッフィングを防ぐ',
    expectedValue: 'nosniff',
    checkPoints: [
      "値がnosniff",
      "ブラウザのコンテンツタイプ推測を無効化"
    ]
  },
  {
    name: 'X-XSS-Protection',
    required: true,
    description: 'ブラウザのXSSフィルターを有効化',
    expectedValue: '1; mode=block',
    checkPoints: [
      "値が1; mode=block",
      "XSS攻撃検出時にページをブロック"
    ]
  },
  {
    name: 'Referrer-Policy',
    required: true,
    description: 'リファラー情報の送信を制御',
    expectedPattern: /strict-origin|no-referrer/,
    checkPoints: [
      "機密情報の漏洩を防ぐ",
      "適切なリファラーポリシーが設定されている"
    ]
  },
  {
    name: 'Permissions-Policy',
    required: true,
    description: 'ブラウザAPIへのアクセスを制御',
    expectedPattern: /camera|microphone|geolocation/,
    checkPoints: [
      "不要なブラウザ機能を無効化",
      "カメラ、マイク、位置情報へのアクセスを制限"
    ]
  },
  {
    name: 'Strict-Transport-Security',
    required: false, // 開発環境では不要
    description: 'HTTPS接続を強制',
    expectedPattern: /max-age=/,
    checkPoints: [
      "本番環境でHTTPS接続を強制",
      "max-ageが適切に設定されている"
    ]
  }
];

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// ヘッダーをチェック
async function checkHeaders(url) {
  console.log(`\n${colors.cyan}🔍 ${url} のヘッダーをチェック中...${colors.reset}\n`);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD' // HEADリクエストでヘッダーのみ取得
    });
    
    const results = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}セキュリティヘッダー確認結果${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
    
    // 各ヘッダーをチェック
    for (const header of requiredHeaders) {
      const value = response.headers.get(header.name.toLowerCase());
      
      console.log(`${colors.cyan}📋 ${header.name}${colors.reset}`);
      console.log(`   説明: ${header.description}`);
      
      if (value) {
        console.log(`   値: ${colors.green}${value}${colors.reset}`);
        
        // 期待値との比較
        let isValid = true;
        
        if (header.expectedValue) {
          isValid = value === header.expectedValue;
          if (!isValid) {
            console.log(`   ${colors.yellow}⚠️ 期待値: ${header.expectedValue}${colors.reset}`);
          }
        }
        
        if (header.expectedPattern) {
          isValid = header.expectedPattern.test(value);
          if (!isValid) {
            console.log(`   ${colors.yellow}⚠️ パターンマッチ失敗${colors.reset}`);
          }
        }
        
        if (isValid) {
          console.log(`   ${colors.green}✅ 正常に設定されています${colors.reset}`);
          results.passed.push(header.name);
        } else {
          console.log(`   ${colors.yellow}⚠️ 値が推奨設定と異なります${colors.reset}`);
          results.warnings.push(header.name);
        }
        
        // チェックポイント表示
        if (header.checkPoints && header.checkPoints.length > 0) {
          console.log(`   ${colors.gray}チェックポイント:${colors.reset}`);
          header.checkPoints.forEach(point => {
            console.log(`     ${colors.gray}• ${point}${colors.reset}`);
          });
        }
      } else {
        if (header.required) {
          console.log(`   ${colors.red}❌ ヘッダーが設定されていません${colors.reset}`);
          results.failed.push(header.name);
        } else {
          console.log(`   ${colors.yellow}⚠️ ヘッダーが設定されていません（オプション）${colors.reset}`);
          results.warnings.push(header.name);
        }
      }
      
      console.log('');
    }
    
    // サマリー表示
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}📊 サマリー${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
    
    console.log(`${colors.green}✅ 合格: ${results.passed.length}/${requiredHeaders.filter(h => h.required).length}${colors.reset}`);
    if (results.passed.length > 0) {
      results.passed.forEach(h => console.log(`   • ${h}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`\n${colors.red}❌ 不合格: ${results.failed.length}${colors.reset}`);
      results.failed.forEach(h => console.log(`   • ${h}`));
    }
    
    if (results.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️ 警告: ${results.warnings.length}${colors.reset}`);
      results.warnings.forEach(h => console.log(`   • ${h}`));
    }
    
    // 総合評価
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    const score = (results.passed.length / requiredHeaders.filter(h => h.required).length) * 100;
    
    if (score === 100) {
      console.log(`${colors.green}🎉 すべての必須セキュリティヘッダーが正しく設定されています！${colors.reset}`);
    } else if (score >= 80) {
      console.log(`${colors.yellow}⚠️ ほとんどのセキュリティヘッダーは設定されていますが、改善の余地があります。${colors.reset}`);
    } else {
      console.log(`${colors.red}⚠️ セキュリティヘッダーの設定に問題があります。早急に対応が必要です。${colors.reset}`);
    }
    
    console.log(`スコア: ${score.toFixed(0)}%`);
    
    return results;
  } catch (error) {
    console.error(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    return null;
  }
}

// 複数のエンドポイントをテスト
async function testMultipleEndpoints() {
  const endpoints = [
    'http://localhost:3000',           // ホームページ
    'http://localhost:3000/api/posts', // API エンドポイント
  ];
  
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🔒 セキュリティヘッダーテスト${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  for (const endpoint of endpoints) {
    await checkHeaders(endpoint);
    console.log('\n');
  }
  
  // 追加の推奨事項
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📝 推奨事項${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`1. ${colors.cyan}Content-Security-Policy${colors.reset}`);
  console.log(`   • 本番環境では'unsafe-inline'と'unsafe-eval'を削除`);
  console.log(`   • 必要最小限のドメインのみを許可`);
  
  console.log(`\n2. ${colors.cyan}Strict-Transport-Security${colors.reset}`);
  console.log(`   • 本番環境では必ず設定（HTTPS強制）`);
  console.log(`   • max-age=31536000以上を推奨`);
  
  console.log(`\n3. ${colors.cyan}定期的な確認${colors.reset}`);
  console.log(`   • セキュリティヘッダーの設定を定期的に確認`);
  console.log(`   • 新しいセキュリティ標準への対応`);
  
  console.log(`\n4. ${colors.cyan}CSPレポート${colors.reset}`);
  console.log(`   • report-uriまたはreport-toディレクティブの設定を検討`);
  console.log(`   • CSP違反のモニタリング`);
}

// メイン実行
console.log(`${colors.yellow}
⚠️ 前提条件:
1. 開発サーバーが起動していること（npm run dev）
2. http://localhost:3000 にアクセスできること
${colors.reset}`);

testMultipleEndpoints().catch(console.error);
// 高度なメール送信テストスクリプト
// さくらインターネットのメールサーバー経由で各種メールテンプレートをテスト

require('dotenv').config({ path: '.env.local' });

// メールライブラリをインポート（CommonJS形式）
async function runTests() {
  // Dynamic import for ES modules
  const { sendEmail, sendVerificationEmail, sendPasswordResetEmail, sendSystemNotification } = await import('../src/lib/email.ts');
  
  console.log('📧 さくらメールサーバー経由のメール送信テスト\n');
  console.log('=' .repeat(60));
  
  // 環境変数チェック
  console.log('\n1. 環境変数チェック:');
  const requiredEnvVars = ['SMTP_USER', 'SMTP_PASS'];
  const optionalEnvVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_FROM', 'TEST_EMAIL_TO'];
  
  let allRequiredPresent = true;
  requiredEnvVars.forEach(varName => {
    const isPresent = !!process.env[varName];
    console.log(`   ${varName}: ${isPresent ? '✅' : '❌'} ${isPresent ? '設定済み' : '未設定（必須）'}`);
    if (!isPresent) allRequiredPresent = false;
  });
  
  optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    console.log(`   ${varName}: ${value ? '✅' : '⚠️'} ${value || 'デフォルト値使用'}`);
  });
  
  if (!allRequiredPresent) {
    console.error('\n❌ 必須の環境変数が設定されていません。.env.localファイルを確認してください。');
    process.exit(1);
  }
  
  const testEmail = process.env.TEST_EMAIL_TO || process.env.SMTP_USER;
  console.log(`\n📮 テストメール送信先: ${testEmail}`);
  
  // テスト選択
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (query) => new Promise((resolve) => rl.question(query, resolve));
  
  console.log('\n送信するテストメールを選択してください:');
  console.log('1. 会員登録確認メール');
  console.log('2. パスワードリセットメール');
  console.log('3. システム通知メール');
  console.log('4. カスタムテストメール');
  console.log('5. すべてのテンプレートをテスト');
  console.log('0. 終了');
  
  const choice = await question('\n選択 (0-5): ');
  
  console.log('\n' + '=' .repeat(60));
  
  try {
    switch(choice) {
      case '1':
        console.log('📝 会員登録確認メール送信中...');
        await sendVerificationEmail(testEmail, 'test-verification-token-12345');
        console.log('✅ 会員登録確認メール送信成功！');
        break;
        
      case '2':
        console.log('🔐 パスワードリセットメール送信中...');
        await sendPasswordResetEmail(testEmail, 'test-reset-token-67890');
        console.log('✅ パスワードリセットメール送信成功！');
        break;
        
      case '3':
        console.log('🔔 システム通知メール送信中...');
        await sendSystemNotification(
          testEmail,
          'テスト通知',
          'これはさくらメールサーバー経由のテスト通知です。\n正常に動作しています。'
        );
        console.log('✅ システム通知メール送信成功！');
        break;
        
      case '4':
        console.log('✉️ カスタムテストメール送信中...');
        const customSubject = await question('件名を入力: ');
        const customMessage = await question('本文を入力: ');
        
        await sendEmail({
          to: testEmail,
          subject: customSubject || 'テストメール',
          html: `<div style="padding: 20px;"><h2>${customSubject}</h2><p>${customMessage}</p></div>`,
          text: customMessage
        });
        console.log('✅ カスタムメール送信成功！');
        break;
        
      case '5':
        console.log('📬 すべてのテンプレートをテスト送信中...\n');
        
        const tests = [
          { name: '会員登録確認', fn: () => sendVerificationEmail(testEmail, 'test-token-1') },
          { name: 'パスワードリセット', fn: () => sendPasswordResetEmail(testEmail, 'test-token-2') },
          { name: 'システム通知', fn: () => sendSystemNotification(testEmail, 'テスト', 'テストメッセージ') }
        ];
        
        for (const test of tests) {
          try {
            console.log(`   ${test.name}: 送信中...`);
            await test.fn();
            console.log(`   ${test.name}: ✅ 成功`);
          } catch (err) {
            console.log(`   ${test.name}: ❌ 失敗 - ${err.message}`);
          }
        }
        console.log('\n✅ すべてのテスト完了！');
        break;
        
      case '0':
        console.log('👋 テスト終了');
        break;
        
      default:
        console.log('⚠️ 無効な選択です');
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 認証エラーの解決方法:');
      console.log('1. SMTP_USER と SMTP_PASS が正しいか確認');
      console.log('2. さくらのコントロールパネルでメールパスワードを再設定');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n💡 接続エラーの解決方法:');
      console.log('1. SMTP_HOST が teqham.sakura.ne.jp か確認');
      console.log('2. SMTP_PORT が 587 か確認');
      console.log('3. ファイアウォール設定を確認');
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📋 テスト結果の確認方法:');
  console.log('1. 送信先メールアドレスの受信箱を確認');
  console.log('2. 迷惑メールフォルダも確認');
  console.log('3. SPF/DKIM/DMARC検証: https://www.mail-tester.com/');
  
  rl.close();
}

// 実行
runTests().catch(console.error);
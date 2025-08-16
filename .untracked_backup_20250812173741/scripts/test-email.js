// メール送信テストスクリプト
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

// テスト設定
const testConfig = {
  // さくらのメールサーバー設定
  sakura: {
    host: 'teqham.sakura.ne.jp',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER || 'noreply@teqham.com',
      pass: process.env.SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false // 開発環境用
    }
  }
};

async function testEmailSending() {
  console.log('📧 メール送信テスト開始...\n');
  
  // 環境変数チェック
  console.log('1. 環境変数の確認:');
  console.log('   SMTP_USER:', process.env.SMTP_USER ? '✅ 設定済み' : '❌ 未設定');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ 設定済み' : '❌ 未設定');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST || 'teqham.sakura.ne.jp');
  console.log('   SMTP_PORT:', process.env.SMTP_PORT || '587');
  console.log('');
  
  if (!process.env.SMTP_PASS) {
    console.error('❌ エラー: SMTP_PASSが設定されていません');
    console.log('\n.env.localファイルに以下を追加してください:');
    console.log('SMTP_USER=noreply@teqham.com');
    console.log('SMTP_PASS=your-password-here');
    return;
  }
  
  // トランスポーター作成
  const transporter = nodemailer.createTransport(testConfig.sakura);
  
  try {
    // SMTP接続テスト
    console.log('2. SMTP接続テスト...');
    await transporter.verify();
    console.log('   ✅ SMTP接続成功\n');
    
    // テストメール送信
    console.log('3. テストメール送信...');
    const testEmail = {
      from: process.env.SMTP_USER || 'noreply@teqham.com',
      to: process.env.TEST_EMAIL_TO || process.env.SMTP_USER || 'admin@teqham.com',
      subject: `テストメール - ${new Date().toLocaleString('ja-JP')}`,
      text: 'これはテストメールです。\n\nさくらのメールサーバー経由で送信されました。',
      html: `
        <h2>テストメール</h2>
        <p>これはテストメールです。</p>
        <p>送信日時: ${new Date().toLocaleString('ja-JP')}</p>
        <hr>
        <p><small>さくらのメールサーバー経由で送信されました。</small></p>
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('   ✅ メール送信成功');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');
    
    console.log('4. セキュリティ設定の確認:');
    console.log('   ✅ STARTTLS使用（ポート587）');
    console.log('   ✅ SMTP認証有効');
    console.log('   ⚠️  本番環境では rejectUnauthorized: true を推奨');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n認証エラーの可能性:');
      console.log('- パスワードが正しいか確認してください');
      console.log('- ユーザー名が正しいか確認してください');
    } else if (error.code === 'ECONNECTION') {
      console.log('\n接続エラーの可能性:');
      console.log('- ホスト名が正しいか確認してください');
      console.log('- ポート番号が正しいか確認してください');
      console.log('- ファイアウォールの設定を確認してください');
    }
  } finally {
    transporter.close();
  }
}

// 実行
testEmailSending().catch(console.error);
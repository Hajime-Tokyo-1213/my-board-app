const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('====== メール送信テスト開始 ======\n');
  
  // 環境変数の確認
  console.log('1. 環境変数チェック:');
  console.log('   SMTP_HOST:', process.env.SMTP_HOST || '❌ 未設定');
  console.log('   SMTP_PORT:', process.env.SMTP_PORT || '❌ 未設定');
  console.log('   SMTP_USER:', process.env.SMTP_USER || '❌ 未設定');
  console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ 設定済み' : '❌ 未設定');
  console.log('   EMAIL_FROM:', process.env.EMAIL_FROM || '❌ 未設定');
  console.log('');

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('❌ エラー: SMTP設定が不足しています');
    return;
  }

  // SMTPトランスポーター作成
  console.log('2. SMTPトランスポーター作成:');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // 587の場合はfalse
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true, // デバッグモード有効
    logger: true, // ログ出力有効
  });

  // SMTP接続テスト
  console.log('\n3. SMTP接続テスト:');
  try {
    await transporter.verify();
    console.log('   ✅ SMTP接続成功！');
  } catch (error) {
    console.log('   ❌ SMTP接続失敗:');
    console.log('   エラー詳細:', error.message);
    console.log('   エラーコード:', error.code);
    console.log('   レスポンス:', error.response);
    console.log('   認証エラー:', error.responseCode);
    return;
  }

  // テストメール送信
  console.log('\n4. テストメール送信:');
  const testEmail = process.argv[2] || 'test@example.com';
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: testEmail,
      subject: 'メール送信テスト',
      text: 'これはテストメールです。',
      html: '<p>これは<b>テストメール</b>です。</p>',
    });

    console.log('   ✅ メール送信成功！');
    console.log('   Message ID:', info.messageId);
    console.log('   Accepted:', info.accepted);
    console.log('   Response:', info.response);
  } catch (error) {
    console.log('   ❌ メール送信失敗:');
    console.log('   エラー詳細:', error.message);
    console.log('   エラーコード:', error.code);
    console.log('   コマンド:', error.command);
    console.log('   レスポンス:', error.response);
    console.log('   レスポンスコード:', error.responseCode);
  }

  console.log('\n====== テスト終了 ======');
}

testEmail();
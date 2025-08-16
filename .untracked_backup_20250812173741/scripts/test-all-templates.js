// すべてのメールテンプレートを自動テストするスクリプト
require('dotenv').config({ path: '.env.local' });
const { createTransport } = require('nodemailer');

// テスト用のトランスポーター作成
const createTransporter = () => {
  return createTransport({
    host: process.env.SMTP_HOST || 'teqham.sakura.ne.jp',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    },
  });
};

// メールテンプレート
const templates = {
  verification: {
    name: '会員登録確認メール',
    subject: '【Board App】会員登録確認',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0070f3; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f7f7f7; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #0070f3; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Board App</h1>
            </div>
            <div class="content">
              <h2>テストユーザー様</h2>
              <p>Board Appへのご登録ありがとうございます。</p>
              <p>以下のボタンをクリックして、メールアドレスの確認を完了してください：</p>
              <div style="text-align: center;">
                <a href="https://app.teqham.com/verify?token=test-token-12345" class="button">メールアドレスを確認</a>
              </div>
              <p style="font-size: 12px; color: #666;">
                このリンクは24時間有効です。<br>
                これはテストメールです。実際のリンクではありません。
              </p>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信はできません。</p>
              <p>&copy; 2025 Board App. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: 'Board Appへのご登録ありがとうございます。これはテストメールです。'
  },
  
  passwordReset: {
    name: 'パスワードリセットメール',
    subject: '【Board App】パスワードリセットのご案内',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f7f7f7; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #dc2626; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .warning { 
              background: #fef2f2; 
              border: 1px solid #fecaca; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>パスワードリセット</h1>
            </div>
            <div class="content">
              <h2>テストユーザー様</h2>
              <p>パスワードリセットのリクエストを受け付けました。</p>
              <p>以下のボタンをクリックして、新しいパスワードを設定してください：</p>
              <div style="text-align: center;">
                <a href="https://app.teqham.com/reset-password?token=test-reset-token" class="button">パスワードをリセット</a>
              </div>
              <div class="warning">
                <strong>⚠️ セキュリティに関する重要なお知らせ</strong><br>
                このリンクは1時間有効です。<br>
                これはテストメールです。実際のリンクではありません。
              </div>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信はできません。</p>
              <p>&copy; 2025 Board App. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: 'パスワードリセットのリクエストを受け付けました。これはテストメールです。'
  },
  
  systemNotification: {
    name: 'システム通知メール',
    subject: '【Board App】システムメンテナンスのお知らせ',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f7f7f7; }
            .info-box {
              background: #e0f2fe;
              border: 1px solid #0284c7;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>システム通知</h1>
            </div>
            <div class="content">
              <h2>テストユーザー様</h2>
              <h3>システムメンテナンスのお知らせ</h3>
              <div class="info-box">
                <strong>メンテナンス日時（テスト）:</strong><br>
                2025年8月20日（火）午前2:00 - 午前4:00<br><br>
                <strong>影響:</strong><br>
                メンテナンス中はサービスをご利用いただけません。<br><br>
                <strong>注意:</strong><br>
                これはテストメールです。実際のメンテナンスではありません。
              </div>
              <p>ご不便をおかけしますが、よろしくお願いいたします。</p>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信はできません。</p>
              <p>&copy; 2025 Board App. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: 'システムメンテナンスのお知らせ。これはテストメールです。'
  }
};

async function testAllTemplates() {
  console.log('📧 メールテンプレート総合テスト\n');
  console.log('=' .repeat(60));
  
  const testEmail = process.env.TEST_EMAIL_TO || process.env.SMTP_USER;
  console.log(`\n送信先: ${testEmail}`);
  console.log('=' .repeat(60));
  
  const transporter = createTransporter();
  const results = [];
  
  for (const [key, template] of Object.entries(templates)) {
    console.log(`\n📮 ${template.name}を送信中...`);
    
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: testEmail,
        subject: `[TEST] ${template.subject}`,
        html: template.html,
        text: template.text,
        headers: {
          'X-Test-Type': key,
          'X-Test-Time': new Date().toISOString()
        }
      });
      
      console.log(`   ✅ 送信成功`);
      console.log(`   Message ID: ${info.messageId}`);
      results.push({ 
        template: template.name, 
        status: '✅ 成功', 
        messageId: info.messageId 
      });
      
    } catch (error) {
      console.log(`   ❌ 送信失敗: ${error.message}`);
      results.push({ 
        template: template.name, 
        status: '❌ 失敗', 
        error: error.message 
      });
    }
  }
  
  // 結果サマリー
  console.log('\n' + '=' .repeat(60));
  console.log('📊 テスト結果サマリー:');
  console.log('=' .repeat(60));
  
  results.forEach(result => {
    console.log(`${result.status} ${result.template}`);
    if (result.messageId) {
      console.log(`     ID: ${result.messageId}`);
    }
    if (result.error) {
      console.log(`     エラー: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.status.includes('✅')).length;
  const failCount = results.filter(r => r.status.includes('❌')).length;
  
  console.log('\n' + '=' .repeat(60));
  console.log(`合計: ${results.length}件のテンプレート`);
  console.log(`成功: ${successCount}件 / 失敗: ${failCount}件`);
  
  if (successCount === results.length) {
    console.log('\n🎉 すべてのテンプレートの送信に成功しました！');
  }
  
  console.log('\n📌 次のステップ:');
  console.log('1. ' + testEmail + ' の受信箱を確認');
  console.log('2. 迷惑メールフォルダも確認');
  console.log('3. HTMLレイアウトが正しく表示されているか確認');
  console.log('4. リンクが正しく機能するか確認（テストリンクです）');
  
  transporter.close();
}

// 実行
testAllTemplates().catch(console.error);
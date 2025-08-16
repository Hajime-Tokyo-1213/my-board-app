// SMTP接続詳細テストスクリプト
const net = require('net');
const tls = require('tls');
require('dotenv').config({ path: '.env.local' });

// テスト対象のメールサーバー
const servers = [
  {
    name: 'さくらメールサーバー（SMTP）',
    host: 'teqham.sakura.ne.jp',
    ports: [
      { port: 587, secure: false, name: 'STARTTLS' },
      { port: 465, secure: true, name: 'SSL/TLS' }
    ]
  },
  {
    name: 'さくらメールサーバー（IMAP）',
    host: 'teqham.sakura.ne.jp',
    ports: [
      { port: 993, secure: true, name: 'IMAP SSL' }
    ]
  },
  {
    name: 'さくらメールサーバー（POP3）',
    host: 'teqham.sakura.ne.jp',
    ports: [
      { port: 995, secure: true, name: 'POP3 SSL' }
    ]
  }
];

// ポート接続テスト
function testPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let connected = false;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      connected = true;
      socket.destroy();
      resolve({ success: true, message: '接続成功' });
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, message: 'タイムアウト' });
    });
    
    socket.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });
    
    socket.connect(port, host);
  });
}

// TLS接続テスト
function testTLS(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const options = {
      host: host,
      port: port,
      rejectUnauthorized: false,
      timeout: timeout
    };
    
    const socket = tls.connect(options, () => {
      const cert = socket.getPeerCertificate();
      socket.destroy();
      resolve({
        success: true,
        message: 'TLS接続成功',
        certificate: {
          subject: cert.subject?.CN || 'N/A',
          issuer: cert.issuer?.CN || 'N/A',
          valid_from: cert.valid_from,
          valid_to: cert.valid_to
        }
      });
    });
    
    socket.on('error', (err) => {
      resolve({ success: false, message: err.message });
    });
    
    socket.setTimeout(timeout, () => {
      socket.destroy();
      resolve({ success: false, message: 'タイムアウト' });
    });
  });
}

// DNSテスト
async function testDNS(host) {
  const dns = require('dns').promises;
  try {
    const addresses = await dns.resolve4(host);
    return { success: true, addresses };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// メインテスト関数
async function runTests() {
  console.log('🔍 メールサーバー接続テスト\n');
  console.log('=' .repeat(60));
  
  // DNS解決テスト
  console.log('\n📡 DNS解決テスト:');
  const dnsResult = await testDNS('teqham.sakura.ne.jp');
  if (dnsResult.success) {
    console.log(`   ✅ DNS解決成功: ${dnsResult.addresses.join(', ')}`);
  } else {
    console.log(`   ❌ DNS解決失敗: ${dnsResult.message}`);
  }
  
  // 各サーバーのテスト
  for (const server of servers) {
    console.log(`\n📧 ${server.name}:`);
    console.log(`   ホスト: ${server.host}`);
    
    for (const portConfig of server.ports) {
      console.log(`\n   ポート ${portConfig.port} (${portConfig.name}):`);
      
      // 基本接続テスト
      const connectResult = await testPort(server.host, portConfig.port);
      console.log(`     接続: ${connectResult.success ? '✅' : '❌'} ${connectResult.message}`);
      
      // TLS接続テスト（セキュアポートの場合）
      if (portConfig.secure && connectResult.success) {
        const tlsResult = await testTLS(server.host, portConfig.port);
        if (tlsResult.success) {
          console.log(`     TLS: ✅ ${tlsResult.message}`);
          if (tlsResult.certificate) {
            console.log(`     証明書:`)
            console.log(`       - Subject: ${tlsResult.certificate.subject}`);
            console.log(`       - Issuer: ${tlsResult.certificate.issuer}`);
            console.log(`       - 有効期限: ${tlsResult.certificate.valid_to}`);
          }
        } else {
          console.log(`     TLS: ❌ ${tlsResult.message}`);
        }
      }
    }
  }
  
  // 環境変数チェック
  console.log('\n\n🔐 環境変数の設定状況:');
  console.log('=' .repeat(60));
  
  const envVars = [
    { name: 'SMTP_HOST', value: process.env.SMTP_HOST, default: 'teqham.sakura.ne.jp' },
    { name: 'SMTP_PORT', value: process.env.SMTP_PORT, default: '587' },
    { name: 'SMTP_USER', value: process.env.SMTP_USER, required: true },
    { name: 'SMTP_PASS', value: process.env.SMTP_PASS, required: true, sensitive: true },
    { name: 'EMAIL_FROM', value: process.env.EMAIL_FROM },
    { name: 'TEST_EMAIL_TO', value: process.env.TEST_EMAIL_TO }
  ];
  
  for (const envVar of envVars) {
    const status = envVar.value ? '✅ 設定済み' : (envVar.required ? '❌ 未設定（必須）' : '⚠️  未設定');
    const displayValue = envVar.sensitive ? '***' : (envVar.value || envVar.default || '未設定');
    console.log(`   ${envVar.name}: ${status}`);
    if (envVar.value || envVar.default) {
      console.log(`     値: ${displayValue}`);
    }
  }
  
  // 推奨設定
  console.log('\n\n💡 推奨設定:');
  console.log('=' .repeat(60));
  console.log('\n.env.localファイルに以下を設定してください:\n');
  console.log('# さくらメールサーバー設定');
  console.log('SMTP_HOST=teqham.sakura.ne.jp');
  console.log('SMTP_PORT=587');
  console.log('SMTP_USER=noreply@teqham.com');
  console.log('SMTP_PASS=your-password-here');
  console.log('EMAIL_FROM=noreply@teqham.com');
  console.log('');
  console.log('# テスト用（オプション）');
  console.log('TEST_EMAIL_TO=admin@teqham.com');
  
  console.log('\n\n✅ テスト完了\n');
}

// 実行
runTests().catch(console.error);
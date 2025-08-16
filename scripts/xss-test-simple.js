#!/usr/bin/env node

// 簡単なXSSテスト（認証なし）
const xssPayloads = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<iframe src="javascript:alert(1)"></iframe>',
];

async function testXSS() {
  console.log('🔒 XSS簡易テスト\n');
  
  for (let i = 0; i < xssPayloads.length; i++) {
    const payload = xssPayloads[i];
    console.log(`テスト ${i + 1}: ${payload.substring(0, 30)}...`);
    
    try {
      const response = await fetch('http://localhost:3000/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `XSS Test ${i + 1}`,
          content: payload
        })
      });
      
      const result = await response.json();
      
      if (response.status === 401) {
        console.log('  結果: 認証が必要（401）');
      } else if (result.data && result.data.content) {
        const safe = !result.data.content.includes('<script') && 
                     !result.data.content.includes('onerror=');
        console.log(`  結果: ${safe ? '✅ 無害化' : '❌ 危険'}`);
        console.log(`  サニタイズ後: ${result.data.content.substring(0, 50)}`);
      }
    } catch (error) {
      console.log(`  エラー: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('\n📝 注: 完全なテストには認証が必要です。');
}

testXSS().catch(console.error);
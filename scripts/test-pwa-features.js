const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPWAFeatures() {
  console.log('🚀 PWA機能テスト開始\n');
  console.log('==================================\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    url: 'http://localhost:3000',
    tests: []
  };

  try {
    // ページにアクセス
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    console.log('📱 1. Web App Manifest テスト');
    console.log('----------------------------------');
    
    // Manifestの存在確認
    const manifestLink = await page.evaluate(() => {
      const link = document.querySelector('link[rel="manifest"]');
      return link ? link.href : null;
    });
    
    if (manifestLink) {
      console.log('✅ Manifest link found:', manifestLink);
      
      // Manifestの内容を取得
      const manifestResponse = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          return await response.json();
        } catch (error) {
          return null;
        }
      }, manifestLink);
      
      if (manifestResponse) {
        console.log('✅ Manifest loaded successfully');
        console.log('  - name:', manifestResponse.name);
        console.log('  - short_name:', manifestResponse.short_name);
        console.log('  - display:', manifestResponse.display);
        console.log('  - start_url:', manifestResponse.start_url);
        console.log('  - icons count:', manifestResponse.icons?.length || 0);
        
        results.tests.push({
          name: 'Web App Manifest',
          status: 'PASS',
          details: {
            name: manifestResponse.name,
            short_name: manifestResponse.short_name,
            display: manifestResponse.display,
            icons: manifestResponse.icons?.length || 0
          }
        });
      } else {
        console.log('❌ Failed to load manifest content');
        results.tests.push({
          name: 'Web App Manifest',
          status: 'FAIL',
          error: 'Could not load manifest content'
        });
      }
    } else {
      console.log('❌ No manifest link found');
      results.tests.push({
        name: 'Web App Manifest',
        status: 'FAIL',
        error: 'No manifest link in HTML'
      });
    }
    
    console.log('\n📦 2. Service Worker テスト');
    console.log('----------------------------------');
    
    // Service Workerの登録確認
    const swRegistration = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (registrations.length > 0) {
          const reg = registrations[0];
          return {
            registered: true,
            scope: reg.scope,
            active: reg.active ? reg.active.state : null,
            waiting: reg.waiting ? reg.waiting.state : null,
            installing: reg.installing ? reg.installing.state : null
          };
        }
      }
      return { registered: false };
    });
    
    if (swRegistration.registered) {
      console.log('✅ Service Worker registered');
      console.log('  - scope:', swRegistration.scope);
      console.log('  - active:', swRegistration.active);
      results.tests.push({
        name: 'Service Worker Registration',
        status: 'PASS',
        details: swRegistration
      });
    } else {
      console.log('❌ Service Worker not registered');
      results.tests.push({
        name: 'Service Worker Registration',
        status: 'FAIL',
        error: 'No Service Worker registration found'
      });
    }
    
    console.log('\n💾 3. キャッシュストレージ テスト');
    console.log('----------------------------------');
    
    // キャッシュの確認
    const cacheInfo = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const cacheDetails = {};
        
        for (const name of cacheNames) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          cacheDetails[name] = requests.length;
        }
        
        return {
          available: true,
          cacheNames,
          cacheDetails
        };
      }
      return { available: false };
    });
    
    if (cacheInfo.available) {
      console.log('✅ Cache Storage available');
      console.log('  - caches found:', cacheInfo.cacheNames.length);
      Object.entries(cacheInfo.cacheDetails).forEach(([name, count]) => {
        console.log(`  - ${name}: ${count} items`);
      });
      results.tests.push({
        name: 'Cache Storage',
        status: 'PASS',
        details: cacheInfo
      });
    } else {
      console.log('❌ Cache Storage not available');
      results.tests.push({
        name: 'Cache Storage',
        status: 'FAIL',
        error: 'Cache Storage API not available'
      });
    }
    
    console.log('\n🔔 4. 通知API テスト');
    console.log('----------------------------------');
    
    // 通知APIの確認
    const notificationInfo = await page.evaluate(() => {
      if ('Notification' in window) {
        return {
          available: true,
          permission: Notification.permission
        };
      }
      return { available: false };
    });
    
    if (notificationInfo.available) {
      console.log('✅ Notification API available');
      console.log('  - permission:', notificationInfo.permission);
      results.tests.push({
        name: 'Notification API',
        status: 'PASS',
        details: notificationInfo
      });
    } else {
      console.log('❌ Notification API not available');
      results.tests.push({
        name: 'Notification API',
        status: 'FAIL',
        error: 'Notification API not supported'
      });
    }
    
    console.log('\n🗄️ 5. IndexedDB テスト');
    console.log('----------------------------------');
    
    // IndexedDBの確認
    const indexedDBInfo = await page.evaluate(async () => {
      if ('indexedDB' in window) {
        try {
          const dbs = await indexedDB.databases();
          return {
            available: true,
            databases: dbs.map(db => ({ name: db.name, version: db.version }))
          };
        } catch (error) {
          return {
            available: true,
            databases: [],
            note: 'Could not list databases (browser limitation)'
          };
        }
      }
      return { available: false };
    });
    
    if (indexedDBInfo.available) {
      console.log('✅ IndexedDB available');
      if (indexedDBInfo.databases.length > 0) {
        console.log('  - databases:', indexedDBInfo.databases.length);
        indexedDBInfo.databases.forEach(db => {
          console.log(`    - ${db.name} (v${db.version})`);
        });
      }
      results.tests.push({
        name: 'IndexedDB',
        status: 'PASS',
        details: indexedDBInfo
      });
    } else {
      console.log('❌ IndexedDB not available');
      results.tests.push({
        name: 'IndexedDB',
        status: 'FAIL',
        error: 'IndexedDB not supported'
      });
    }
    
    console.log('\n🌐 6. オフラインページ テスト');
    console.log('----------------------------------');
    
    // オフラインページの確認
    const offlinePageResponse = await page.goto('http://localhost:3000/offline.html', {
      waitUntil: 'networkidle2'
    });
    
    if (offlinePageResponse && offlinePageResponse.status() === 200) {
      const offlinePageContent = await page.evaluate(() => {
        return {
          title: document.title,
          hasOfflineText: document.body.textContent.includes('オフライン')
        };
      });
      
      console.log('✅ Offline page exists');
      console.log('  - title:', offlinePageContent.title);
      console.log('  - has offline text:', offlinePageContent.hasOfflineText);
      results.tests.push({
        name: 'Offline Page',
        status: 'PASS',
        details: offlinePageContent
      });
    } else {
      console.log('❌ Offline page not found');
      results.tests.push({
        name: 'Offline Page',
        status: 'FAIL',
        error: 'Offline page returns error'
      });
    }
    
  } catch (error) {
    console.error('テスト中にエラーが発生しました:', error.message);
    results.error = error.message;
  } finally {
    await browser.close();
  }
  
  // 結果のサマリー
  console.log('\n==================================');
  console.log('📊 テスト結果サマリー');
  console.log('==================================\n');
  
  const passedTests = results.tests.filter(t => t.status === 'PASS').length;
  const failedTests = results.tests.filter(t => t.status === 'FAIL').length;
  
  console.log(`✅ 成功: ${passedTests} テスト`);
  console.log(`❌ 失敗: ${failedTests} テスト`);
  console.log(`📊 成功率: ${Math.round((passedTests / results.tests.length) * 100)}%`);
  
  // 結果をJSONファイルに保存
  const reportPath = path.join(__dirname, '..', 'pwa-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n📁 詳細レポート保存先: ${reportPath}`);
  
  return results;
}

// テスト実行
testPWAFeatures().catch(console.error);
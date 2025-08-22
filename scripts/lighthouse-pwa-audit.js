const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

// Lighthouse設定
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['pwa', 'performance', 'best-practices'],
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    screenEmulation: {
      mobile: true,
      width: 412,
      height: 823,
      deviceScaleFactor: 1.75,
    },
  },
};

async function launchChromeAndRunLighthouse(url, opts, config = null) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: opts.chromeFlags,
    port: opts.port,
  });

  opts.port = chrome.port;

  try {
    const results = await lighthouse(url, opts, config);
    await chrome.kill();
    return results.lhr;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

async function runPWAAudit() {
  const url = process.argv[2] || 'http://localhost:3000';
  
  console.log('🚀 Starting PWA Audit for:', url);
  console.log('==================================\n');

  const opts = {
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox'],
    port: 0,
  };

  try {
    const results = await launchChromeAndRunLighthouse(url, opts, config);
    
    // PWAスコアと詳細
    console.log('📱 PWA Score:', Math.round(results.categories.pwa.score * 100));
    console.log('⚡ Performance Score:', Math.round(results.categories.performance.score * 100));
    console.log('✅ Best Practices Score:', Math.round(results.categories['best-practices'].score * 100));
    console.log('\n==================================\n');

    // PWA監査の詳細結果
    console.log('📋 PWA Audit Details:\n');
    
    const pwaAudits = Object.values(results.audits).filter(audit => 
      audit.details && audit.id.includes('webapp') || 
      audit.id.includes('service-worker') ||
      audit.id.includes('manifest') ||
      audit.id.includes('installable') ||
      audit.id.includes('offline') ||
      audit.id.includes('https')
    );

    // PWA関連の主要な監査項目
    const keyPWAAudits = [
      'installable-manifest',
      'service-worker',
      'offline-start-url',
      'is-on-https',
      'viewport',
      'apple-touch-icon',
      'maskable-icon',
      'content-width',
      'themed-omnibox',
      'splash-screen',
      'pwa-cross-browser',
      'pwa-page-transitions',
      'pwa-each-page-has-url'
    ];

    keyPWAAudits.forEach(auditId => {
      const audit = results.audits[auditId];
      if (audit) {
        const status = audit.score === 1 ? '✅' : audit.score === 0 ? '❌' : '⚠️';
        console.log(`${status} ${audit.title}`);
        if (audit.score !== 1 && audit.description) {
          console.log(`   └─ ${audit.description}`);
        }
        if (audit.score !== 1 && audit.details && audit.details.debugData) {
          console.log(`   └─ Debug: ${JSON.stringify(audit.details.debugData)}`);
        }
      }
    });

    console.log('\n==================================\n');

    // マニフェストの詳細
    const manifestAudit = results.audits['installable-manifest'];
    if (manifestAudit && manifestAudit.details) {
      console.log('📄 Manifest Status:');
      if (manifestAudit.score === 1) {
        console.log('✅ Valid Web App Manifest detected');
      } else {
        console.log('❌ Issues with Web App Manifest:');
        if (manifestAudit.details.debugData) {
          console.log(manifestAudit.details.debugData);
        }
      }
    }

    console.log('\n==================================\n');

    // Service Workerの詳細
    const swAudit = results.audits['service-worker'];
    if (swAudit) {
      console.log('🔧 Service Worker Status:');
      if (swAudit.score === 1) {
        console.log('✅ Service Worker is registered and working');
      } else {
        console.log('❌ Service Worker issues detected');
        if (swAudit.description) {
          console.log(`   └─ ${swAudit.description}`);
        }
      }
    }

    console.log('\n==================================\n');

    // オフライン機能の詳細
    const offlineAudit = results.audits['offline-start-url'];
    if (offlineAudit) {
      console.log('📡 Offline Capability:');
      if (offlineAudit.score === 1) {
        console.log('✅ App works offline');
      } else {
        console.log('❌ Offline functionality not working properly');
        if (offlineAudit.description) {
          console.log(`   └─ ${offlineAudit.description}`);
        }
      }
    }

    console.log('\n==================================\n');

    // パフォーマンスメトリクス
    console.log('📊 Performance Metrics:\n');
    const metrics = results.audits.metrics.details.items[0];
    console.log(`First Contentful Paint: ${Math.round(metrics.firstContentfulPaint)}ms`);
    console.log(`Largest Contentful Paint: ${Math.round(metrics.largestContentfulPaint)}ms`);
    console.log(`Time to Interactive: ${Math.round(metrics.interactive)}ms`);
    console.log(`Speed Index: ${Math.round(metrics.speedIndex)}ms`);
    console.log(`Total Blocking Time: ${Math.round(metrics.totalBlockingTime)}ms`);
    console.log(`Cumulative Layout Shift: ${metrics.cumulativeLayoutShift}`);

    // レポートをHTMLファイルとして保存
    const reportHtml = lighthouse.generateReport(results, 'html');
    const reportPath = path.join(__dirname, '..', 'lighthouse-pwa-report.html');
    fs.writeFileSync(reportPath, reportHtml);
    console.log(`\n📁 Full report saved to: ${reportPath}`);

    // JSON形式でも保存
    const reportJson = JSON.stringify(results, null, 2);
    const jsonPath = path.join(__dirname, '..', 'lighthouse-pwa-report.json');
    fs.writeFileSync(jsonPath, reportJson);
    console.log(`📁 JSON report saved to: ${jsonPath}`);

    // 総合評価
    console.log('\n==================================');
    console.log('🎯 PWA Readiness Summary:\n');
    
    const pwaScore = results.categories.pwa.score * 100;
    if (pwaScore >= 90) {
      console.log('🏆 Excellent! Your app is PWA-ready.');
    } else if (pwaScore >= 70) {
      console.log('👍 Good! Your app has most PWA features.');
      console.log('   Consider fixing the remaining issues for full PWA compliance.');
    } else if (pwaScore >= 50) {
      console.log('⚠️  Fair. Your app needs improvements to be PWA-compliant.');
    } else {
      console.log('❌ Poor. Significant work needed for PWA compliance.');
    }

    console.log('\n==================================\n');

  } catch (error) {
    console.error('Error running Lighthouse:', error);
    process.exit(1);
  }
}

// 実行
runPWAAudit();
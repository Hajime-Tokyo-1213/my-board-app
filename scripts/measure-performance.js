#!/usr/bin/env node

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs').promises;
const path = require('path');

// パフォーマンス測定設定
const CONFIG = {
  urls: [
    { name: 'Home', url: 'http://localhost:3000/' },
    { name: 'Posts', url: 'http://localhost:3000/posts' },
    { name: 'Post Detail', url: 'http://localhost:3000/posts/1' },
    { name: 'New Post', url: 'http://localhost:3000/posts/new' },
  ],
  iterations: 3, // 各URLを何回測定するか
  throttling: {
    // ネットワークとCPUのスロットリング設定
    rttMs: 40,
    throughputKbps: 10 * 1024, // 10Mbps
    cpuSlowdownMultiplier: 4,
  },
  lighthouse: {
    onlyCategories: ['performance'],
    formFactor: 'desktop',
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false,
    },
  },
};

// Core Web Vitalsの閾値
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
  TBT: { good: 200, poor: 600 },
};

// パフォーマンスメトリクスを収集
async function collectMetrics(page, url) {
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Web Vitalsを収集
  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const data = {
        navigation: {},
        paint: {},
        vitals: {},
        resources: {
          count: 0,
          size: 0,
          duration: 0,
        },
        memory: {},
      };

      // Navigation Timing
      const navTiming = performance.getEntriesByType('navigation')[0];
      if (navTiming) {
        data.navigation = {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
          domInteractive: navTiming.domInteractive - navTiming.fetchStart,
          ttfb: navTiming.responseStart - navTiming.requestStart,
        };
      }

      // Paint Timing
      const paintMetrics = performance.getEntriesByType('paint');
      paintMetrics.forEach((metric) => {
        data.paint[metric.name] = metric.startTime;
      });

      // Resource Timing
      const resources = performance.getEntriesByType('resource');
      data.resources.count = resources.length;
      data.resources.size = resources.reduce((total, r) => total + (r.transferSize || 0), 0);
      data.resources.duration = resources.reduce((max, r) => Math.max(max, r.responseEnd), 0);

      // Memory (Chrome only)
      if (performance.memory) {
        data.memory = {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
      }

      // Web Vitalsの収集（LCP, FID, CLS）
      if (window.PerformanceObserver) {
        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          data.vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });

        // CLS
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          data.vitals.CLS = clsValue;
        }).observe({ type: 'layout-shift', buffered: true });

        // FCP
        const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
        if (fcpEntry) {
          data.vitals.FCP = fcpEntry.startTime;
        }
      }

      // データ収集を待つ
      setTimeout(() => resolve(data), 3000);
    });
  });

  return metrics;
}

// Lighthouseでパフォーマンスを測定
async function runLighthouse(url, browser) {
  const { lhr } = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json',
    logLevel: 'error',
    ...CONFIG.lighthouse,
  });

  return {
    score: lhr.categories.performance.score * 100,
    metrics: {
      FCP: lhr.audits['first-contentful-paint'].numericValue,
      LCP: lhr.audits['largest-contentful-paint'].numericValue,
      TBT: lhr.audits['total-blocking-time'].numericValue,
      CLS: lhr.audits['cumulative-layout-shift'].numericValue,
      SpeedIndex: lhr.audits['speed-index'].numericValue,
      TTI: lhr.audits['interactive'].numericValue,
    },
    opportunities: lhr.audits['performance-budget']?.details?.items || [],
  };
}

// メトリクスの評価
function evaluateMetric(value, thresholds) {
  if (value <= thresholds.good) return '🟢 Good';
  if (value <= thresholds.poor) return '🟡 Needs Improvement';
  return '🔴 Poor';
}

// レポートの生成
function generateReport(results) {
  let report = '# Performance Test Report\n\n';
  report += `**Date:** ${new Date().toLocaleString()}\n\n`;

  results.forEach((result) => {
    report += `## ${result.name} (${result.url})\n\n`;
    
    // Lighthouse Score
    report += `### Lighthouse Performance Score: ${result.lighthouse.score.toFixed(1)}/100\n\n`;
    
    // Core Web Vitals
    report += '### Core Web Vitals\n\n';
    report += '| Metric | Value | Status |\n';
    report += '|--------|-------|--------|\n';
    
    const vitals = result.lighthouse.metrics;
    report += `| LCP | ${vitals.LCP.toFixed(0)}ms | ${evaluateMetric(vitals.LCP, THRESHOLDS.LCP)} |\n`;
    report += `| FCP | ${vitals.FCP.toFixed(0)}ms | ${evaluateMetric(vitals.FCP, THRESHOLDS.FCP)} |\n`;
    report += `| TBT | ${vitals.TBT.toFixed(0)}ms | ${evaluateMetric(vitals.TBT, THRESHOLDS.TBT)} |\n`;
    report += `| CLS | ${vitals.CLS.toFixed(3)} | ${evaluateMetric(vitals.CLS, THRESHOLDS.CLS)} |\n`;
    report += `| Speed Index | ${vitals.SpeedIndex.toFixed(0)}ms | - |\n`;
    report += `| TTI | ${vitals.TTI.toFixed(0)}ms | - |\n\n`;
    
    // Custom Metrics
    if (result.custom) {
      report += '### Custom Metrics\n\n';
      report += `- **TTFB:** ${result.custom.navigation.ttfb.toFixed(0)}ms\n`;
      report += `- **DOM Interactive:** ${result.custom.navigation.domInteractive.toFixed(0)}ms\n`;
      report += `- **Resources:** ${result.custom.resources.count} files, ${(result.custom.resources.size / 1024).toFixed(1)}KB\n`;
      
      if (result.custom.memory.usedJSHeapSize) {
        report += `- **JS Heap:** ${(result.custom.memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB / ${(result.custom.memory.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB\n`;
      }
      report += '\n';
    }
  });

  return report;
}

// JSONレポートの生成
function generateJSONReport(results) {
  return {
    timestamp: new Date().toISOString(),
    results: results.map(r => ({
      name: r.name,
      url: r.url,
      lighthouse: r.lighthouse,
      custom: r.custom,
    })),
    summary: {
      averageScore: results.reduce((sum, r) => sum + r.lighthouse.score, 0) / results.length,
      averageLCP: results.reduce((sum, r) => sum + r.lighthouse.metrics.LCP, 0) / results.length,
      averageFCP: results.reduce((sum, r) => sum + r.lighthouse.metrics.FCP, 0) / results.length,
      averageTBT: results.reduce((sum, r) => sum + r.lighthouse.metrics.TBT, 0) / results.length,
      averageCLS: results.reduce((sum, r) => sum + r.lighthouse.metrics.CLS, 0) / results.length,
    },
  };
}

// メイン処理
async function main() {
  console.log('🚀 Starting Performance Tests...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  try {
    for (const target of CONFIG.urls) {
      console.log(`📊 Testing: ${target.name} (${target.url})`);
      
      const page = await browser.newPage();
      
      // ビューポートの設定
      await page.setViewport({ width: 1920, height: 1080 });
      
      // ネットワークスロットリング
      await page.emulateNetworkConditions({
        offline: false,
        downloadThroughput: CONFIG.throttling.throughputKbps * 1024 / 8,
        uploadThroughput: CONFIG.throttling.throughputKbps * 1024 / 8,
        latency: CONFIG.throttling.rttMs,
      });
      
      // CPUスロットリング
      await page.emulateCPUThrottling(CONFIG.throttling.cpuSlowdownMultiplier);
      
      // カスタムメトリクスの収集
      const customMetrics = await collectMetrics(page, target.url);
      
      // Lighthouse測定
      const lighthouseResults = await runLighthouse(target.url, browser);
      
      results.push({
        name: target.name,
        url: target.url,
        lighthouse: lighthouseResults,
        custom: customMetrics,
      });
      
      await page.close();
      console.log(`✅ Completed: ${target.name}\n`);
    }

    // レポートの生成
    const markdownReport = generateReport(results);
    const jsonReport = generateJSONReport(results);

    // レポートの保存
    const reportsDir = path.join(__dirname, '..', 'performance-reports');
    await fs.mkdir(reportsDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await fs.writeFile(
      path.join(reportsDir, `report-${timestamp}.md`),
      markdownReport
    );
    await fs.writeFile(
      path.join(reportsDir, `report-${timestamp}.json`),
      JSON.stringify(jsonReport, null, 2)
    );

    // コンソールに要約を表示
    console.log('📈 Performance Test Summary\n');
    console.log('='.repeat(50));
    results.forEach((result) => {
      console.log(`\n${result.name}:`);
      console.log(`  Performance Score: ${result.lighthouse.score.toFixed(1)}/100`);
      console.log(`  LCP: ${result.lighthouse.metrics.LCP.toFixed(0)}ms ${evaluateMetric(result.lighthouse.metrics.LCP, THRESHOLDS.LCP)}`);
      console.log(`  FCP: ${result.lighthouse.metrics.FCP.toFixed(0)}ms ${evaluateMetric(result.lighthouse.metrics.FCP, THRESHOLDS.FCP)}`);
      console.log(`  CLS: ${result.lighthouse.metrics.CLS.toFixed(3)} ${evaluateMetric(result.lighthouse.metrics.CLS, THRESHOLDS.CLS)}`);
    });
    console.log('\n' + '='.repeat(50));
    console.log(`\n✅ Reports saved to: ${reportsDir}`);

  } catch (error) {
    console.error('❌ Error during performance testing:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { collectMetrics, runLighthouse, generateReport };
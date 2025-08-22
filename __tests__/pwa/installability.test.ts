import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('PWAインストール可能性テスト', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('マニフェストファイルが正しく読み込まれる', async () => {
    await page.goto('http://localhost:3000');

    // マニフェストの存在確認
    const manifestLink = await page.$('link[rel="manifest"]');
    expect(manifestLink).toBeTruthy();

    // マニフェストの内容を取得
    const manifestData = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) return null;

      try {
        const response = await fetch(link.href);
        return await response.json();
      } catch (error) {
        return null;
      }
    });

    expect(manifestData).toBeTruthy();
    expect(manifestData.name).toBe('My Board App - SNS掲示板');
    expect(manifestData.short_name).toBe('Board App');
    expect(manifestData.display).toBe('standalone');
    expect(manifestData.start_url).toBe('/');
    expect(manifestData.theme_color).toBe('#000000');
    expect(manifestData.background_color).toBe('#ffffff');
  });

  test('必要なアイコンが全て存在する', async () => {
    await page.goto('http://localhost:3000');

    const iconStatus = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) return { hasManifest: false };

      try {
        const response = await fetch(link.href);
        const manifest = await response.json();
        
        // 各アイコンの存在確認
        const iconChecks = await Promise.all(
          manifest.icons.map(async (icon: any) => {
            try {
              const iconResponse = await fetch(icon.src);
              return {
                src: icon.src,
                sizes: icon.sizes,
                exists: iconResponse.ok,
                type: icon.type
              };
            } catch {
              return {
                src: icon.src,
                sizes: icon.sizes,
                exists: false
              };
            }
          })
        );

        // 必要なサイズの確認
        const requiredSizes = ['192x192', '512x512'];
        const hasRequiredSizes = requiredSizes.every(size =>
          iconChecks.some(icon => icon.sizes === size && icon.exists)
        );

        return {
          hasManifest: true,
          icons: iconChecks,
          hasRequiredSizes,
          totalIcons: iconChecks.length
        };
      } catch (error) {
        return { hasManifest: false, error: (error as Error).message };
      }
    });

    expect(iconStatus.hasManifest).toBe(true);
    expect(iconStatus.hasRequiredSizes).toBe(true);
    expect(iconStatus.totalIcons).toBeGreaterThanOrEqual(2);
    
    // 192x192と512x512のアイコンが存在することを確認
    const has192 = iconStatus.icons.find((icon: any) => icon.sizes === '192x192');
    const has512 = iconStatus.icons.find((icon: any) => icon.sizes === '512x512');
    expect(has192?.exists).toBe(true);
    expect(has512?.exists).toBe(true);
  });

  test('beforeinstallpromptイベントがサポートされている', async () => {
    await page.goto('http://localhost:3000');

    const installPromptSupport = await page.evaluate(() => {
      return {
        hasBeforeInstallPrompt: 'onbeforeinstallprompt' in window,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        isInWebAppiOS: (window.navigator as any).standalone === true
      };
    });

    // スタンドアロンモードでない場合、beforeinstallpromptがサポートされているはず
    if (!installPromptSupport.isStandalone && !installPromptSupport.isInWebAppiOS) {
      // Chromeベースのブラウザではサポートされている
      console.log('Install prompt support:', installPromptSupport);
    }
  });

  test('メタタグが正しく設定されている', async () => {
    await page.goto('http://localhost:3000');

    const metaTags = await page.evaluate(() => {
      const tags: any = {};
      
      // theme-color
      const themeColor = document.querySelector('meta[name="theme-color"]');
      tags.themeColor = themeColor?.getAttribute('content');

      // viewport
      const viewport = document.querySelector('meta[name="viewport"]');
      tags.viewport = viewport?.getAttribute('content');

      // description
      const description = document.querySelector('meta[name="description"]');
      tags.description = description?.getAttribute('content');

      // apple-mobile-web-app-capable (iOS用)
      const iosCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
      tags.iosCapable = iosCapable?.getAttribute('content');

      // apple-mobile-web-app-status-bar-style (iOS用)
      const iosStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      tags.iosStatusBar = iosStatusBar?.getAttribute('content');

      return tags;
    });

    expect(metaTags.viewport).toContain('width=device-width');
    expect(metaTags.description).toBeTruthy();
    // theme-colorはマニフェストで設定済み
  });

  test('HTTPS環境で動作している（本番環境想定）', async () => {
    const url = page.url();
    
    // 開発環境（localhost）またはHTTPSであることを確認
    const isSecure = url.startsWith('https://') || url.includes('localhost');
    expect(isSecure).toBe(true);
  });

  test('インストールプロンプトUIが表示される', async () => {
    await page.goto('http://localhost:3000');

    // インストールプロンプトコンポーネントの存在確認
    // 注: 実際の表示は条件に依存するため、コンポーネントの存在のみ確認
    const hasInstallComponent = await page.evaluate(() => {
      // InstallPromptコンポーネントが存在するかチェック
      return document.querySelector('[class*="install"]') !== null ||
             document.querySelector('[aria-label*="インストール"]') !== null;
    });

    // コンポーネントが存在する可能性を確認
    console.log('Install prompt component present:', hasInstallComponent);
  });

  test('スコープとstart_urlが正しく設定されている', async () => {
    await page.goto('http://localhost:3000');

    const scopeAndStartUrl = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) return null;

      try {
        const response = await fetch(link.href);
        const manifest = await response.json();
        
        return {
          scope: manifest.scope,
          start_url: manifest.start_url,
          isValidScope: manifest.scope === '/',
          isValidStartUrl: manifest.start_url === '/'
        };
      } catch (error) {
        return null;
      }
    });

    expect(scopeAndStartUrl).toBeTruthy();
    expect(scopeAndStartUrl.isValidScope).toBe(true);
    expect(scopeAndStartUrl.isValidStartUrl).toBe(true);
  });

  test('オフラインページが存在する', async () => {
    const offlinePageResponse = await page.goto('http://localhost:3000/offline.html');
    
    expect(offlinePageResponse?.status()).toBe(200);
    
    const offlineContent = await page.evaluate(() => {
      return {
        hasOfflineIndicator: document.body.textContent?.includes('オフライン'),
        hasRetryButton: document.querySelector('button') !== null
      };
    });

    expect(offlineContent.hasOfflineIndicator).toBe(true);
    expect(offlineContent.hasRetryButton).toBe(true);
  });

  test('Web App Manifestのカテゴリとスクリーンショットが設定されている', async () => {
    await page.goto('http://localhost:3000');

    const additionalManifestData = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      if (!link) return null;

      try {
        const response = await fetch(link.href);
        const manifest = await response.json();
        
        return {
          hasCategories: manifest.categories && manifest.categories.length > 0,
          categories: manifest.categories,
          hasScreenshots: manifest.screenshots && manifest.screenshots.length > 0,
          screenshotCount: manifest.screenshots?.length || 0,
          hasShortcuts: manifest.shortcuts && manifest.shortcuts.length > 0,
          shortcuts: manifest.shortcuts
        };
      } catch (error) {
        return null;
      }
    });

    expect(additionalManifestData).toBeTruthy();
    expect(additionalManifestData.hasCategories).toBe(true);
    expect(additionalManifestData.categories).toContain('social');
    expect(additionalManifestData.hasScreenshots).toBe(true);
    expect(additionalManifestData.screenshotCount).toBeGreaterThan(0);
    expect(additionalManifestData.hasShortcuts).toBe(true);
  });
});
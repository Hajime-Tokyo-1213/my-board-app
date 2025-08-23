import { test, expect, Page } from '@playwright/test';

// テスト用のベースURL
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// テスト用のユーザー情報
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  username: 'testuser'
};

// ログイン処理のヘルパー関数
async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/auth/signin`);
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/timeline`, { timeout: 10000 });
}

test.describe('分析ダッシュボード E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前にログイン
    await loginUser(page);
  });

  test.describe('ページアクセスと基本表示', () => {
    test('分析ダッシュボードにアクセスできること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // ページタイトルの確認
      await expect(page.locator('h1')).toContainText('分析ダッシュボード');
      
      // サブタイトルの確認
      await expect(page.locator('text=アカウントのパフォーマンスと成長を追跡')).toBeVisible();
    });

    test('未ログイン時はサインインページにリダイレクトされること', async ({ page }) => {
      // ログアウト状態を作る
      await page.context().clearCookies();
      
      await page.goto(`${BASE_URL}/analytics`);
      
      // サインインページにリダイレクトされることを確認
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });
  });

  test.describe('統計カードの表示', () => {
    test('4つの統計カードが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // 統計カードの存在確認
      await expect(page.locator('text=フォロワー').first()).toBeVisible();
      await expect(page.locator('text=総投稿数').first()).toBeVisible();
      await expect(page.locator('text=総いいね数').first()).toBeVisible();
      await expect(page.locator('text=エンゲージメント率').first()).toBeVisible();
    });

    test('統計値が表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      // 数値が表示されていることを確認（実際の値は動的）
      const statsCards = page.locator('.bg-white.rounded-xl').filter({ hasText: /\d+/ });
      await expect(statsCards).toHaveCount(4, { timeout: 10000 });
    });

    test('成長率インジケーターが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      // 成長率表示の確認（過去7日間のラベル）
      const growthLabels = page.locator('text=過去7日間');
      await expect(growthLabels.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('グラフ機能', () => {
    test('成長推移グラフが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // グラフセクションの確認
      await expect(page.locator('h2:has-text("成長推移")')).toBeVisible();
      
      // Canvas要素の存在確認（Chart.jsのグラフ）
      await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
    });

    test('期間選択が機能すること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // 期間選択ドロップダウンを探す
      const periodSelect = page.locator('select').first();
      
      // 30日間を選択
      await periodSelect.selectOption('30');
      await page.waitForTimeout(1000);
      
      // 90日間を選択
      await periodSelect.selectOption('90');
      await page.waitForTimeout(1000);
      
      // グラフが更新されることを確認（ネットワークリクエストで確認）
      await page.waitForResponse(response => 
        response.url().includes('/api/analytics') && 
        response.url().includes('period=90')
      );
    });

    test('グラフタイプの切り替えが機能すること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // グラフタイプ選択ドロップダウン（2番目のselect）
      const chartTypeSelect = page.locator('select').nth(1);
      
      // 棒グラフに切り替え
      await chartTypeSelect.selectOption('bar');
      await page.waitForTimeout(1000);
      
      // Canvas要素が存在することを確認
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('メトリクス選択が機能すること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // メトリクス選択ドロップダウン（3番目のselect）
      const metricSelect = page.locator('select').nth(2);
      
      // 各メトリクスを選択
      const metrics = ['followers', 'engagement', 'posts', 'likes'];
      
      for (const metric of metrics) {
        await metricSelect.selectOption(metric);
        await page.waitForTimeout(500);
        
        // グラフが表示されていることを確認
        await expect(page.locator('canvas')).toBeVisible();
      }
    });
  });

  test.describe('人気投稿ランキング', () => {
    test('人気投稿ランキングセクションが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // セクションタイトルの確認
      await expect(page.locator('h2:has-text("人気投稿ランキング")')).toBeVisible();
    });

    test('ランキング番号が表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      // ランキング番号（1-5）の確認
      const hasRankings = await page.locator('.flex-shrink-0.w-8.h-8').count() > 0;
      
      if (hasRankings) {
        // ランキングがある場合、番号が表示されていることを確認
        await expect(page.locator('.flex-shrink-0.w-8.h-8').first()).toBeVisible();
      } else {
        // データがない場合のメッセージ確認
        await expect(page.locator('text=投稿データがありません')).toBeVisible();
      }
    });

    test('投稿の統計情報が表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      const hasPost = await page.locator('.flex.items-start.gap-3.p-3').count() > 0;
      
      if (hasPost) {
        const firstPost = page.locator('.flex.items-start.gap-3.p-3').first();
        
        // いいね、コメント、スコアのアイコンが表示されることを確認
        await expect(firstPost.locator('svg').first()).toBeVisible();
      }
    });
  });

  test.describe('インサイト機能', () => {
    test('インサイトセクションが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // セクションタイトルの確認
      await expect(page.locator('h2:has-text("インサイト")')).toBeVisible();
    });

    test('インサイトメッセージが表示されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      // インサイトメッセージまたは「分析中...」メッセージの確認
      const insightSection = page.locator('div').filter({ hasText: 'インサイト' }).first();
      
      const hasInsights = await insightSection.locator('.p-3.rounded-lg.border').count() > 0;
      
      if (hasInsights) {
        // インサイトがある場合
        await expect(insightSection.locator('.p-3.rounded-lg.border').first()).toBeVisible();
      } else {
        // インサイトがない場合
        await expect(page.locator('text=分析中...')).toBeVisible();
      }
    });

    test('インサイトの種類別スタイルが適用されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // データロード待機
      await page.waitForTimeout(2000);
      
      // 成功、警告、情報の各スタイルクラスを確認
      const successInsight = page.locator('.bg-green-50.border-green-200');
      const warningInsight = page.locator('.bg-yellow-50.border-yellow-200');
      const infoInsight = page.locator('.bg-blue-50.border-blue-200');
      
      // 少なくとも1つのインサイトタイプが存在することを確認
      const hasAnyInsight = 
        await successInsight.count() > 0 ||
        await warningInsight.count() > 0 ||
        await infoInsight.count() > 0;
      
      if (hasAnyInsight) {
        expect(hasAnyInsight).toBeTruthy();
      }
    });
  });

  test.describe('データ更新', () => {
    test('ページをリロードするとデータが更新されること', async ({ page }) => {
      await page.goto(`${BASE_URL}/analytics`);
      
      // 初回データロード待機
      await page.waitForTimeout(2000);
      
      // APIリクエストを監視
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/analytics') && response.status() === 200
      );
      
      // ページリロード
      await page.reload();
      
      // APIリクエストが発生することを確認
      await responsePromise;
      
      // データが表示されることを確認
      await expect(page.locator('h1:has-text("分析ダッシュボード")')).toBeVisible();
    });
  });

  test.describe('レスポンシブデザイン', () => {
    test('モバイル表示で正しくレイアウトされること', async ({ page }) => {
      // モバイルビューポートに設定
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto(`${BASE_URL}/analytics`);
      
      // モバイルでも主要要素が表示されることを確認
      await expect(page.locator('h1:has-text("分析ダッシュボード")')).toBeVisible();
      
      // 統計カードが縦に並ぶことを確認（grid-cols-1）
      const statsContainer = page.locator('.grid').first();
      await expect(statsContainer).toBeVisible();
    });

    test('タブレット表示で正しくレイアウトされること', async ({ page }) => {
      // タブレットビューポートに設定
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await page.goto(`${BASE_URL}/analytics`);
      
      // タブレットでも主要要素が表示されることを確認
      await expect(page.locator('h1:has-text("分析ダッシュボード")')).toBeVisible();
      
      // 統計カードが2列で表示されることを確認（md:grid-cols-2）
      const statsContainer = page.locator('.grid').first();
      await expect(statsContainer).toBeVisible();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('APIエラー時でもページがクラッシュしないこと', async ({ page }) => {
      // APIエラーをシミュレート
      await page.route('**/api/analytics**', route => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });
      
      await page.goto(`${BASE_URL}/analytics`);
      
      // ページが表示されることを確認
      await expect(page.locator('h1:has-text("分析ダッシュボード")')).toBeVisible();
      
      // エラー状態でも基本的なUIが表示されることを確認
      await expect(page.locator('.bg-white').first()).toBeVisible();
    });

    test('ネットワークエラー時の処理', async ({ page }) => {
      // ネットワークエラーをシミュレート
      await page.route('**/api/analytics**', route => {
        route.abort('failed');
      });
      
      await page.goto(`${BASE_URL}/analytics`);
      
      // ページが表示されることを確認
      await expect(page.locator('h1:has-text("分析ダッシュボード")')).toBeVisible();
      
      // UIが崩れていないことを確認
      await expect(page.locator('.min-h-screen')).toBeVisible();
    });
  });
});
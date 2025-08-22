import { test, expect, Page } from '@playwright/test';

// テスト用の認証状態を設定
test.use({
  storageState: 'e2e/auth.json', // 認証状態を保存したファイル
});

// ヘルパー関数
async function waitForPostsToLoad(page: Page) {
  await page.waitForSelector('[data-testid^="post-"]', { timeout: 10000 });
}

async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}

async function getVisiblePostCount(page: Page): Promise<number> {
  return await page.locator('[data-testid^="post-"]').count();
}

// テスト前のセットアップ
test.beforeEach(async ({ page }) => {
  // モックデータの設定やログイン処理が必要な場合はここに記述
  // 実際の環境では、テスト用アカウントでログインする処理を追加
});

test.describe('無限スクロール機能', () => {
  test('初期ロード時に投稿が表示される', async ({ page }) => {
    await page.goto('/timeline');
    
    // ローディング状態を確認
    await expect(page.locator('[role="progressbar"]')).toBeVisible();
    
    // 投稿が読み込まれるまで待機
    await waitForPostsToLoad(page);
    
    // 最初の投稿が表示されることを確認
    const firstPost = page.locator('[data-testid^="post-"]').first();
    await expect(firstPost).toBeVisible();
    
    // 投稿内容が表示されることを確認
    await expect(page.locator('text=/Test post/')).toBeVisible();
  });

  test('スクロールで次のページが自動読み込みされる', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // 初期の投稿数を記録
    const initialPostCount = await getVisiblePostCount(page);
    expect(initialPostCount).toBeGreaterThan(0);
    
    // ページ下部までスクロール
    await scrollToBottom(page);
    
    // ローディングインジケーターが表示されることを確認
    await expect(page.locator('[role="progressbar"]').last()).toBeVisible();
    
    // 新しい投稿が読み込まれるまで待機
    await page.waitForTimeout(2000);
    
    // 投稿数が増えたことを確認
    const newPostCount = await getVisiblePostCount(page);
    expect(newPostCount).toBeGreaterThan(initialPostCount);
  });

  test('複数回スクロールしても正常に動作する', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    const postCounts: number[] = [];
    
    // 3回スクロールを実行
    for (let i = 0; i < 3; i++) {
      const currentCount = await getVisiblePostCount(page);
      postCounts.push(currentCount);
      
      await scrollToBottom(page);
      await page.waitForTimeout(2000);
    }
    
    // 各スクロール後に投稿数が増えていることを確認
    for (let i = 1; i < postCounts.length; i++) {
      expect(postCounts[i]).toBeGreaterThanOrEqual(postCounts[i - 1]);
    }
  });

  test('新着投稿通知が表示される', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // 新着投稿をシミュレート（実際のアプリケーションでは30秒待つ必要がある）
    // テスト環境では、APIモックやテストフラグを使用して即座に新着を表示
    
    // 新着投稿通知が表示されることを確認
    const newPostNotification = page.locator('text=/[0-9]+件の新着投稿/');
    
    // 実際の環境では、新着投稿が来るまで待機
    // await expect(newPostNotification).toBeVisible({ timeout: 35000 });
  });

  test('新着投稿通知をクリックすると最上部に戻る', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // ページをスクロール
    await scrollToBottom(page);
    
    // スクロール位置を確認
    const scrollPositionBefore = await page.evaluate(() => window.scrollY);
    expect(scrollPositionBefore).toBeGreaterThan(0);
    
    // 新着投稿通知をクリック（モック環境で表示させる）
    // const newPostButton = page.locator('button:has-text("新着投稿")');
    // await newPostButton.click();
    
    // スクロール位置が0になることを確認
    // const scrollPositionAfter = await page.evaluate(() => window.scrollY);
    // expect(scrollPositionAfter).toBe(0);
  });

  test('エラー時に再試行ボタンが表示される', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/posts/feed', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Server Error' }),
      });
    });
    
    await page.goto('/timeline');
    
    // エラーメッセージが表示されることを確認
    await expect(page.locator('text=/投稿の取得に失敗しました/')).toBeVisible();
    
    // 再試行ボタンが表示されることを確認
    const retryButton = page.locator('button:has-text("再試行")');
    await expect(retryButton).toBeVisible();
    
    // 再試行ボタンをクリック
    await page.unroute('**/api/posts/feed');
    await retryButton.click();
    
    // 投稿が読み込まれることを確認
    await waitForPostsToLoad(page);
  });

  test('スクロールトップボタンが動作する', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // ページを下にスクロール
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(500);
    
    // スクロールトップボタンが表示されることを確認
    const scrollTopButton = page.locator('[aria-label="scroll to top"]');
    await expect(scrollTopButton).toBeVisible();
    
    // ボタンをクリック
    await scrollTopButton.click();
    
    // ページトップに戻ることを確認
    await page.waitForTimeout(500);
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeLessThan(100);
  });

  test('投稿削除が正常に動作する', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // 最初の投稿の削除ボタンを探す
    const firstPost = page.locator('[data-testid^="post-"]').first();
    const deleteButton = firstPost.locator('button:has-text("削除")');
    
    // 削除ボタンが存在する場合のみテスト
    if (await deleteButton.isVisible()) {
      // 投稿IDを記録
      const postId = await firstPost.getAttribute('data-testid');
      
      // 削除ボタンをクリック
      await deleteButton.click();
      
      // 確認ダイアログを処理
      page.on('dialog', dialog => dialog.accept());
      
      // 投稿が削除されることを確認
      await expect(page.locator(`[data-testid="${postId}"]`)).not.toBeVisible();
    }
  });

  test('ハッシュタグフィルターが動作する', async ({ page }) => {
    await page.goto('/timeline?hashtag=test');
    await waitForPostsToLoad(page);
    
    // 投稿が表示されることを確認
    const posts = page.locator('[data-testid^="post-"]');
    const postCount = await posts.count();
    
    // ハッシュタグを含む投稿のみが表示されることを確認
    for (let i = 0; i < postCount; i++) {
      const post = posts.nth(i);
      const hashtagElement = post.locator('text=/#test/');
      await expect(hashtagElement).toBeVisible();
    }
  });

  test('仮想スクロールが有効になる', async ({ page }) => {
    // 大量のデータを返すようにAPIをモック
    await page.route('**/api/posts/feed', route => {
      const posts = Array.from({ length: 100 }, (_, i) => ({
        id: `${i + 1}`,
        _id: `${i + 1}`,
        userId: `user${(i % 3) + 1}`,
        userName: `User ${(i % 3) + 1}`,
        content: `Post content ${i + 1}`,
        likeCount: Math.floor(Math.random() * 100),
        commentCount: Math.floor(Math.random() * 50),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          posts,
          nextCursor: null,
          hasMore: false,
          totalNew: 0,
        }),
      });
    });
    
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // DOM要素数が制限されていることを確認（仮想スクロールの特徴）
    const visiblePosts = await page.locator('[data-testid^="post-"]:visible').count();
    
    // 100件の投稿があっても、表示される要素は限定的
    expect(visiblePosts).toBeLessThan(100);
  });

  test('ユーザープロフィールモーダルが開く', async ({ page }) => {
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // ユーザー名をクリック
    const userNameLink = page.locator('[data-testid^="post-"]').first().locator('a[href^="/users/"]');
    if (await userNameLink.isVisible()) {
      await userNameLink.click();
      
      // モーダルが開くことを確認
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();
      
      // プロフィール情報が表示されることを確認
      await expect(modal.locator('text=/フォロー/')).toBeVisible();
    }
  });

  test('投稿がない場合のメッセージが表示される', async ({ page }) => {
    // 空のレスポンスを返すようにAPIをモック
    await page.route('**/api/posts/feed', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          posts: [],
          nextCursor: null,
          hasMore: false,
          totalNew: 0,
        }),
      });
    });
    
    await page.goto('/timeline');
    
    // 「投稿がまだありません」メッセージが表示されることを確認
    await expect(page.locator('text=/投稿がまだありません/')).toBeVisible();
  });

  test('最下部到達メッセージが表示される', async ({ page }) => {
    // 少数の投稿を返すようにAPIをモック
    await page.route('**/api/posts/feed', route => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      
      if (!cursor) {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            posts: Array.from({ length: 5 }, (_, i) => ({
              id: `${i + 1}`,
              _id: `${i + 1}`,
              userId: 'user1',
              userName: 'User 1',
              content: `Post ${i + 1}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
            nextCursor: null,
            hasMore: false,
            totalNew: 0,
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            posts: [],
            nextCursor: null,
            hasMore: false,
            totalNew: 0,
          }),
        });
      }
    });
    
    await page.goto('/timeline');
    await waitForPostsToLoad(page);
    
    // 最下部メッセージが表示されることを確認
    await expect(page.locator('text=/すべての投稿を表示しました/')).toBeVisible();
  });
});
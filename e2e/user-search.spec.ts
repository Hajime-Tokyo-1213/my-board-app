import { test, expect } from '@playwright/test';

test.describe('User Search E2E Tests', () => {
  // テスト前のセットアップ
  test.beforeEach(async ({ page }) => {
    // ログイン処理（実際の環境に合わせて調整）
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    
    // ユーザー検索ページへ移動
    await page.goto('/search/users');
  });

  test.describe('Japanese Text Search', () => {
    test('should search with hiragana text', async ({ page }) => {
      // ひらがなで検索
      await page.fill('input[placeholder*="ユーザーを検索"]', 'たなか');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      // 検索結果を待機
      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      
      // 結果が表示されることを確認
      const results = await page.locator('[data-testid="user-card"]').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should search with katakana text', async ({ page }) => {
      // カタカナで検索
      await page.fill('input[placeholder*="ユーザーを検索"]', 'タナカ');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      const results = await page.locator('[data-testid="user-card"]').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should search with kanji text', async ({ page }) => {
      // 漢字で検索
      await page.fill('input[placeholder*="ユーザーを検索"]', '田中');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      const results = await page.locator('[data-testid="user-card"]').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should handle mixed Japanese text', async ({ page }) => {
      // 混合テキストで検索
      await page.fill('input[placeholder*="ユーザーを検索"]', '山田たろう');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      
      // エラーが表示されないことを確認
      const errorMessage = await page.locator('[data-testid="error-message"]').count();
      expect(errorMessage).toBe(0);
    });
  });

  test.describe('Partial Match Search', () => {
    test('should find users with partial name match', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', '田');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      
      // 部分一致で複数の結果が返ることを確認
      const results = await page.locator('[data-testid="user-card"]').all();
      for (const result of results) {
        const text = await result.textContent();
        expect(text?.toLowerCase()).toContain('田');
      }
    });

    test('should find users with partial username match', async ({ page }) => {
      // ユーザー名タブに切り替え
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.click('button:has-text("ユーザー名")');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');

      await page.waitForSelector('[data-testid="search-results"]', { timeout: 5000 });
      
      const usernames = await page.locator('[data-testid="username"]').allTextContents();
      for (const username of usernames) {
        expect(username.toLowerCase()).toContain('test');
      }
    });
  });

  test.describe('Suggestion Features', () => {
    test('should show suggestions while typing', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="ユーザーを検索"]');
      
      // ゆっくり入力してサジェストを表示
      await searchInput.type('た', { delay: 100 });
      
      // サジェストが表示されるまで待機
      await page.waitForSelector('[data-testid="suggestions-dropdown"]', { timeout: 5000 });
      
      // サジェストアイテムが存在することを確認
      const suggestions = await page.locator('[data-testid="suggestion-item"]').count();
      expect(suggestions).toBeGreaterThan(0);
    });

    test('should navigate to user profile from suggestion', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.waitForSelector('[data-testid="suggestions-dropdown"]');
      
      // ユーザータイプのサジェストをクリック
      const userSuggestion = page.locator('[data-testid="suggestion-item"][data-type="user"]').first();
      await userSuggestion.click();
      
      // プロフィールページへ遷移することを確認
      await page.waitForURL(/\/users\/[a-zA-Z0-9]+/);
      expect(page.url()).toMatch(/\/users\/[a-zA-Z0-9]+/);
    });

    test('should show search history suggestions', async ({ page }) => {
      // 検索履歴を作成
      await page.fill('input[placeholder*="ユーザーを検索"]', '検索履歴テスト');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForTimeout(1000);
      
      // 入力をクリア
      await page.fill('input[placeholder*="ユーザーを検索"]', '');
      
      // 再度入力開始
      await page.fill('input[placeholder*="ユーザーを検索"]', '検索');
      await page.waitForSelector('[data-testid="suggestions-dropdown"]');
      
      // 履歴サジェストが表示されることを確認
      const historySuggestion = await page.locator('[data-testid="suggestion-item"][data-type="history"]').count();
      expect(historySuggestion).toBeGreaterThan(0);
    });
  });

  test.describe('Recommended Users', () => {
    test('should display recommended users tab', async ({ page }) => {
      // おすすめユーザータブをクリック
      await page.click('button[role="tab"]:has-text("おすすめユーザー")');
      
      // おすすめユーザーが表示されるまで待機
      await page.waitForSelector('[data-testid="recommended-users"]', { timeout: 5000 });
      
      // おすすめユーザーが存在することを確認
      const recommendedUsers = await page.locator('[data-testid="recommended-user-card"]').count();
      expect(recommendedUsers).toBeGreaterThan(0);
    });

    test('should fetch different types of recommendations', async ({ page }) => {
      await page.click('button[role="tab"]:has-text("おすすめユーザー")');
      
      // 人気ユーザーを取得
      await page.click('button:has-text("人気ユーザー")');
      await page.waitForTimeout(1000);
      let users = await page.locator('[data-testid="recommended-user-card"]').count();
      expect(users).toBeGreaterThan(0);
      
      // アクティブユーザーを取得
      await page.click('button:has-text("アクティブ")');
      await page.waitForTimeout(1000);
      users = await page.locator('[data-testid="recommended-user-card"]').count();
      expect(users).toBeGreaterThan(0);
      
      // 新規ユーザーを取得
      await page.click('button:has-text("新規ユーザー")');
      await page.waitForTimeout(1000);
      users = await page.locator('[data-testid="recommended-user-card"]').count();
      expect(users).toBeGreaterThan(0);
    });

    test('should show recommendation reasons', async ({ page }) => {
      await page.click('button[role="tab"]:has-text("おすすめユーザー")');
      await page.waitForSelector('[data-testid="recommended-users"]');
      
      // おすすめ理由が表示されることを確認
      const reasons = await page.locator('[data-testid="recommendation-reason"]').allTextContents();
      for (const reason of reasons) {
        expect(reason).toBeTruthy();
        expect(reason).toMatch(/共通の興味|人気|アクティブ|新規/);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should show no results message for non-existent user', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'nonexistentuser12345');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      
      // エラーメッセージが表示されることを確認
      await page.waitForSelector('[data-testid="no-results-message"]', { timeout: 5000 });
      const message = await page.locator('[data-testid="no-results-message"]').textContent();
      expect(message).toContain('一致するユーザーが見つかりませんでした');
    });

    test('should handle network errors gracefully', async ({ page, context }) => {
      // ネットワークエラーをシミュレート
      await context.route('**/api/users/search**', route => route.abort());
      
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      
      // アプリケーションがクラッシュしないことを確認
      await page.waitForTimeout(2000);
      const searchInput = await page.locator('input[placeholder*="ユーザーを検索"]').isVisible();
      expect(searchInput).toBeTruthy();
    });

    test('should clear search results on clear button', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // クリアボタンをクリック
      await page.click('[data-testid="clear-search-button"]');
      
      // 検索結果がクリアされることを確認
      const results = await page.locator('[data-testid="search-results"]').isVisible();
      expect(results).toBeFalsy();
      
      // 入力フィールドがクリアされることを確認
      const inputValue = await page.inputValue('input[placeholder*="ユーザーを検索"]');
      expect(inputValue).toBe('');
    });
  });

  test.describe('Search Options', () => {
    test('should filter search by type', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      
      // 名前で検索
      await page.click('button:has-text("名前")');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // 自己紹介で検索
      await page.click('button:has-text("自己紹介")');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // フィルタが適用されていることを確認（URLパラメータで）
      expect(page.url()).toContain('type=bio');
    });

    test('should sort search results', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // 人気順でソート
      await page.click('button:has-text("人気順")');
      await page.waitForTimeout(1000);
      
      // フォロワー数が降順になっていることを確認
      const followerCounts = await page.locator('[data-testid="follower-count"]').allTextContents();
      const counts = followerCounts.map(c => parseInt(c.replace(/[^0-9]/g, '')));
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
    });
  });

  test.describe('Follow/Unfollow Actions', () => {
    test('should follow a user from search results', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // フォローボタンをクリック
      const followButton = page.locator('button:has-text("フォロー")').first();
      await followButton.click();
      
      // ボタンのテキストが「フォロー中」に変わることを確認
      await page.waitForTimeout(1000);
      const buttonText = await followButton.textContent();
      expect(buttonText).toContain('フォロー中');
    });

    test('should unfollow a user from search results', async ({ page }) => {
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      
      // フォロー中のユーザーを探す
      const unfollowButton = page.locator('button:has-text("フォロー中")').first();
      if (await unfollowButton.isVisible()) {
        await unfollowButton.click();
        
        // ボタンのテキストが「フォロー」に変わることを確認
        await page.waitForTimeout(1000);
        const buttonText = await unfollowButton.textContent();
        expect(buttonText).toBe('フォロー');
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should be responsive on mobile devices', async ({ page }) => {
      await page.goto('/search/users');
      
      // 検索ボックスが表示されることを確認
      const searchInput = await page.locator('input[placeholder*="ユーザーを検索"]').isVisible();
      expect(searchInput).toBeTruthy();
      
      // モバイルで検索
      await page.fill('input[placeholder*="ユーザーを検索"]', 'test');
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      
      // 結果がモバイルビューで正しく表示されることを確認
      await page.waitForSelector('[data-testid="search-results"]');
      const userCards = await page.locator('[data-testid="user-card"]').count();
      expect(userCards).toBeGreaterThan(0);
    });
  });

  test.describe('Performance', () => {
    test('should handle large result sets efficiently', async ({ page }) => {
      // 一般的な検索語で多くの結果を取得
      await page.fill('input[placeholder*="ユーザーを検索"]', 'a');
      
      const startTime = Date.now();
      await page.press('input[placeholder*="ユーザーを検索"]', 'Enter');
      await page.waitForSelector('[data-testid="search-results"]');
      const endTime = Date.now();
      
      // 検索が3秒以内に完了することを確認
      expect(endTime - startTime).toBeLessThan(3000);
      
      // 結果が表示されることを確認
      const results = await page.locator('[data-testid="user-card"]').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should debounce search suggestions', async ({ page }) => {
      let requestCount = 0;
      
      // APIリクエストをインターセプト
      await page.route('**/api/users/suggestions**', route => {
        requestCount++;
        route.continue();
      });
      
      // 素早く複数文字を入力
      const searchInput = page.locator('input[placeholder*="ユーザーを検索"]');
      await searchInput.type('test', { delay: 50 });
      
      // デバウンス時間待機
      await page.waitForTimeout(500);
      
      // リクエスト数が入力文字数より少ないことを確認（デバウンスが効いている）
      expect(requestCount).toBeLessThan(4);
    });
  });
});
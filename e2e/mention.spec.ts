import { test, expect } from '@playwright/test';

test.describe('メンション機能', () => {
  test.beforeEach(async ({ page }) => {
    // テスト用アカウントでログイン
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000');
  });

  test.describe('@入力の検出', () => {
    test('新規投稿で@を入力すると候補が表示される', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      // 投稿フォームに@を入力
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('Hello @');
      
      // 候補リストが表示されることを確認
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
    });

    test('コメント入力で@を入力すると候補が表示される', async ({ page }) => {
      // 既存の投稿ページへ移動
      await page.goto('http://localhost:3000/posts/1');
      
      // コメント入力フィールドに@を入力
      const commentInput = page.locator('input[placeholder="コメントを入力..."]');
      await commentInput.fill('@');
      
      // 候補リストが表示されることを確認
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
    });

    test('@の後にスペースを入力すると候補が消える', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@');
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      await contentInput.fill('@ ');
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
    });
  });

  test.describe('候補の表示と選択', () => {
    test('ユーザー名で候補が絞り込まれる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@user');
      
      // 候補リストが表示される
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // 候補にuserを含むユーザーが表示される
      const suggestions = page.locator('[data-testid^="suggestion-"]');
      await expect(suggestions).toHaveCount(3); // テストデータに依存
      await expect(suggestions.first()).toContainText('user');
    });

    test('マウスクリックで候補を選択できる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('Hello @user');
      
      // 最初の候補をクリック
      await page.locator('[data-testid^="suggestion-"]').first().click();
      
      // 入力フィールドにユーザー名が挿入される
      await expect(contentInput).toHaveValue(/Hello @\w+ /);
      
      // 候補リストが閉じる
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
    });

    test('キーボードで候補を選択できる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@user');
      
      // 候補リストが表示される
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // 下矢印キーで次の候補に移動
      await contentInput.press('ArrowDown');
      await contentInput.press('ArrowDown');
      
      // Enterキーで選択
      await contentInput.press('Enter');
      
      // 入力フィールドにユーザー名が挿入される
      await expect(contentInput).toHaveValue(/@\w+ /);
    });

    test('Escapeキーで候補リストを閉じる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@user');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      await contentInput.press('Escape');
      
      await expect(page.locator('[data-testid="mention-suggestions"]')).not.toBeVisible();
    });
  });

  test.describe('日本語入力対応', () => {
    test('ひらがなのユーザー名で検索できる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@たなか');
      
      // 候補リストが表示される
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // 田中さんが候補に表示される
      const suggestions = page.locator('[data-testid^="suggestion-"]');
      await expect(suggestions.first()).toContainText('田中');
    });

    test('カタカナのユーザー名で検索できる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@タナカ');
      
      // 候補リストが表示される
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // タナカさんが候補に表示される
      const suggestions = page.locator('[data-testid^="suggestion-"]');
      await expect(suggestions).toContainText('タナカ');
    });

    test('漢字のユーザー名で検索できる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@田中');
      
      // 候補リストが表示される
      await expect(page.locator('[data-testid="mention-suggestions"]')).toBeVisible();
      
      // 田中さんが候補に表示される
      const suggestions = page.locator('[data-testid^="suggestion-"]');
      await expect(suggestions.first()).toContainText('田中');
    });
  });

  test.describe('通知の送信', () => {
    test('メンション付き投稿を作成すると通知が送信される', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      // メンション付き投稿を作成
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('Hello @user1 !');
      
      // user1を選択
      await page.locator('[data-testid="suggestion-user1"]').click();
      
      // 投稿を送信
      await page.click('button[type="submit"]');
      
      // 投稿が成功することを確認
      await expect(page).toHaveURL(/\/posts\/\w+/);
      
      // メンションされたテキストが表示される
      await expect(page.locator('.post-content')).toContainText('@user1');
    });

    test('メンション付きコメントを作成すると通知が送信される', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/1');
      
      // メンション付きコメントを作成
      const commentInput = page.locator('input[placeholder="コメントを入力..."]');
      await commentInput.fill('@user2 ');
      
      // user2を選択
      await page.locator('[data-testid="suggestion-user2"]').click();
      
      await commentInput.fill('@user2 こんにちは');
      
      // コメントを送信
      await commentInput.press('Enter');
      
      // コメントが表示される
      await expect(page.locator('.comment-content').last()).toContainText('@user2');
    });
  });

  test.describe('複数メンション', () => {
    test('1つの投稿に複数のメンションを含められる', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      
      // 最初のメンション
      await contentInput.fill('@user1 ');
      await page.locator('[data-testid="suggestion-user1"]').click();
      
      // 2番目のメンション
      await contentInput.fill(await contentInput.inputValue() + 'and @user2 ');
      await page.locator('[data-testid="suggestion-user2"]').click();
      
      // 3番目のメンション
      await contentInput.fill(await contentInput.inputValue() + 'and @user3');
      await page.locator('[data-testid="suggestion-user3"]').click();
      
      // 投稿を送信
      await page.click('button[type="submit"]');
      
      // 全てのメンションが表示される
      await expect(page.locator('.post-content')).toContainText('@user1');
      await expect(page.locator('.post-content')).toContainText('@user2');
      await expect(page.locator('.post-content')).toContainText('@user3');
    });

    test('最大メンション数を超えるとエラーが表示される', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      let content = '';
      
      // 11個のメンションを追加（制限は10個）
      for (let i = 1; i <= 11; i++) {
        content += `@user${i} `;
      }
      
      await contentInput.fill(content);
      
      // 各メンションを選択
      for (let i = 1; i <= 11; i++) {
        const suggestion = page.locator(`[data-testid="suggestion-user${i}"]`);
        if (await suggestion.isVisible()) {
          await suggestion.click();
        }
      }
      
      // 投稿を送信
      await page.click('button[type="submit"]');
      
      // エラーメッセージが表示される
      await expect(page.locator('.error-message')).toContainText('メンションは最大10個まで');
    });
  });

  test.describe('グループメンション', () => {
    test('@allで全員にメンション', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@all ');
      
      // @all候補が表示される
      await expect(page.locator('[data-testid="suggestion-all"]')).toBeVisible();
      
      // @allを選択
      await page.locator('[data-testid="suggestion-all"]').click();
      
      // 投稿を送信
      await page.click('button[type="submit"]');
      
      // @allが表示される
      await expect(page.locator('.post-content')).toContainText('@all');
    });

    test('@teamでチームメンバーにメンション', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/new');
      
      const contentInput = page.locator('textarea[name="content"]');
      await contentInput.fill('@team ');
      
      // @team候補が表示される
      await expect(page.locator('[data-testid="suggestion-team"]')).toBeVisible();
      
      // @teamを選択
      await page.locator('[data-testid="suggestion-team"]').click();
      
      // 投稿を送信
      await page.click('button[type="submit"]');
      
      // @teamが表示される
      await expect(page.locator('.post-content')).toContainText('@team');
    });
  });

  test.describe('メンション表示', () => {
    test('メンションがリンクとして表示される', async ({ page }) => {
      // メンション付き投稿のページへ移動
      await page.goto('http://localhost:3000/posts/2'); // メンション付き投稿
      
      // メンションリンクが存在する
      const mentionLink = page.locator('a.mention-link');
      await expect(mentionLink).toBeVisible();
      await expect(mentionLink).toHaveAttribute('href', /\/users\/\w+/);
    });

    test('メンションリンクをクリックするとプロフィールページへ移動', async ({ page }) => {
      await page.goto('http://localhost:3000/posts/2');
      
      // メンションリンクをクリック
      await page.locator('a.mention-link').first().click();
      
      // ユーザープロフィールページへ移動
      await expect(page).toHaveURL(/\/users\/\w+/);
    });
  });

  test.describe('通知受信', () => {
    test('メンションされた場合通知ベルにバッジが表示される', async ({ page, context }) => {
      // 別のユーザーでログイン（2つ目のブラウザコンテキスト）
      const page2 = await context.newPage();
      await page2.goto('http://localhost:3000/login');
      await page2.fill('input[name="email"]', 'user2@example.com');
      await page2.fill('input[name="password"]', 'password2');
      await page2.click('button[type="submit"]');
      
      // user2がuser1をメンション
      await page2.goto('http://localhost:3000/posts/new');
      const contentInput = page2.locator('textarea[name="content"]');
      await contentInput.fill('@user1 Hello!');
      await page2.locator('[data-testid="suggestion-user1"]').click();
      await page2.click('button[type="submit"]');
      
      // user1のページをリロード
      await page.reload();
      
      // 通知ベルにバッジが表示される
      const notificationBadge = page.locator('.notification-badge');
      await expect(notificationBadge).toBeVisible();
      await expect(notificationBadge).toContainText('1');
      
      await page2.close();
    });

    test('通知リストにメンション通知が表示される', async ({ page }) => {
      // 通知ベルをクリック
      await page.locator('.notification-bell').click();
      
      // 通知リストが表示される
      await expect(page.locator('.notification-list')).toBeVisible();
      
      // メンション通知が表示される
      const mentionNotification = page.locator('.notification-item').filter({ hasText: 'メンション' });
      await expect(mentionNotification).toBeVisible();
      await expect(mentionNotification).toContainText('さんがあなたをメンションしました');
    });
  });
});
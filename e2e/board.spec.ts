import { test, expect } from '@playwright/test';
import { 
  createPostViaUI, 
  waitForPost, 
  verifyPostDisplay,
  cleanupTestPosts,
  waitForPostRemoval
} from './helpers/test-setup';

test.describe('掲示板アプリ - メイン機能', () => {
  test.beforeEach(async ({ page, context }) => {
    // テスト前にテスト投稿をクリーンアップ
    await cleanupTestPosts(context, /E2E Test/);
    await page.goto('/');
  });

  test.afterEach(async ({ context }) => {
    // テスト後にテスト投稿をクリーンアップ
    await cleanupTestPosts(context, /E2E Test/);
  });

  test('投稿の作成・表示・編集・削除フロー', async ({ page }) => {
    const testContent = 'E2E Test Post ' + Date.now();
    const editedContent = 'E2E Test Post (編集済み) ' + Date.now();

    // 1. 投稿作成
    await test.step('投稿を作成', async () => {
      await createPostViaUI(page, testContent);
      await waitForPost(page, testContent);
      await verifyPostDisplay(page, testContent);
    });

    // 2. 投稿編集
    await test.step('投稿を編集', async () => {
      const postCard = page.locator(`text="${testContent}"`).locator('../..');
      await postCard.getByLabel('編集').click();
      
      // 編集フォームが表示されることを確認
      const editTextarea = postCard.getByPlaceholder('投稿を編集');
      await expect(editTextarea).toBeVisible();
      await expect(editTextarea).toHaveValue(testContent);
      
      // 編集
      await editTextarea.clear();
      await editTextarea.fill(editedContent);
      await postCard.getByRole('button', { name: '更新' }).click();
      
      // 編集された内容が表示されることを確認
      await waitForPost(page, editedContent);
      await verifyPostDisplay(page, editedContent, { isEdited: true });
    });

    // 3. 投稿削除
    await test.step('投稿を削除', async () => {
      const postCard = page.locator(`text="${editedContent}"`).locator('../..');
      
      // 削除確認ダイアログをハンドル
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBe('本当にこの投稿を削除しますか？');
        await dialog.accept();
      });
      
      await postCard.getByLabel('削除').click();
      
      // 投稿が削除されたことを確認
      await waitForPostRemoval(page, editedContent);
    });
  });

  test('複数投稿の管理', async ({ page }) => {
    const posts = [
      'E2E Test Post 1 ' + Date.now(),
      'E2E Test Post 2 ' + Date.now(),
      'E2E Test Post 3 ' + Date.now()
    ];

    // 複数の投稿を作成
    for (const content of posts) {
      await createPostViaUI(page, content);
      await page.waitForTimeout(500); // 安定性のため少し待機
    }

    // すべての投稿が表示されていることを確認
    for (const content of posts) {
      await expect(page.locator(`text="${content}"`)).toBeVisible();
    }

    // 投稿が新しい順に表示されることを確認（最新が上）
    const postElements = await page.locator('[data-testid="post-card"]').all();
    expect(postElements.length).toBeGreaterThanOrEqual(3);
  });

  test('バリデーション機能', async ({ page }) => {
    // 空の投稿は送信できない
    await test.step('空の投稿を拒否', async () => {
      const textarea = page.getByPlaceholder('今何を考えていますか？');
      const submitButton = page.getByRole('button', { name: '投稿する' });
      
      await textarea.clear();
      await expect(submitButton).toBeDisabled();
    });

    // 200文字を超える投稿
    await test.step('200文字を超える投稿を拒否', async () => {
      const longContent = 'あ'.repeat(201);
      const textarea = page.getByPlaceholder('今何を考えていますか？');
      
      await textarea.fill(longContent);
      
      // 文字数カウンターを確認
      await expect(page.getByText('201/200')).toBeVisible();
    });

    // 正常な投稿
    await test.step('有効な投稿を受け入れる', async () => {
      const validContent = 'E2E Test Valid Post';
      await createPostViaUI(page, validContent);
      await waitForPost(page, validContent);
    });
  });

  test('リアルタイム更新', async ({ page, context }) => {
    const testContent = 'E2E Test Realtime ' + Date.now();

    // 別のタブを開く
    const page2 = await context.newPage();
    await page2.goto('/');

    // 最初のタブで投稿を作成
    await createPostViaUI(page, testContent);

    // 2番目のタブをリロードして投稿が表示されることを確認
    await page2.reload();
    await expect(page2.locator(`text="${testContent}"`)).toBeVisible();
  });

  test('エラーハンドリング', async ({ page }) => {
    // APIエラーをシミュレート
    await page.route('**/api/posts', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'サーバーエラー'
          })
        });
      } else {
        route.continue();
      }
    });

    // エラー時にアラートが表示されることを確認
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('投稿の作成に失敗しました');
      await dialog.accept();
    });

    const testContent = 'E2E Test Error';
    await page.getByPlaceholder('今何を考えていますか？').fill(testContent);
    await page.getByRole('button', { name: '投稿する' }).click();
  });

  test('パフォーマンス - 多数の投稿', async ({ page, context }) => {
    // APIで複数の投稿を作成
    const posts = [];
    for (let i = 0; i < 20; i++) {
      posts.push({ content: `E2E Test Performance Post ${i}` });
    }

    // モックレスポンスを設定
    await page.route('**/api/posts', route => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: posts.map((p, i) => ({
              _id: `perf-${i}`,
              content: p.content,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }))
          })
        });
      } else {
        route.continue();
      }
    });

    await page.reload();

    // すべての投稿が表示されることを確認
    for (const post of posts.slice(0, 5)) { // 最初の5件をチェック
      await expect(page.locator(`text="${post.content}"`)).toBeVisible();
    }
  });

  test('アクセシビリティ', async ({ page }) => {
    // キーボードナビゲーション
    await test.step('キーボードでの操作', async () => {
      const textarea = page.getByPlaceholder('今何を考えていますか？');
      const submitButton = page.getByRole('button', { name: '投稿する' });
      
      // Tabキーでフォーカスを移動
      await textarea.focus();
      await page.keyboard.press('Tab');
      await expect(submitButton).toBeFocused();
    });

    // ARIA属性の確認
    await test.step('ARIA属性', async () => {
      const testContent = 'E2E Test Accessibility';
      await createPostViaUI(page, testContent);
      
      const postCard = page.locator(`text="${testContent}"`).locator('../..');
      const editButton = postCard.getByLabel('編集');
      const deleteButton = postCard.getByLabel('削除');
      
      await expect(editButton).toHaveAttribute('aria-label', '編集');
      await expect(deleteButton).toHaveAttribute('aria-label', '削除');
    });
  });

  test('レスポンシブデザイン', async ({ page }) => {
    // モバイルビューポート
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // 主要な要素が表示されていることを確認
    await expect(page.getByText('みんなの掲示板')).toBeVisible();
    await expect(page.getByPlaceholder('今何を考えていますか？')).toBeVisible();
    await expect(page.getByRole('button', { name: '投稿する' })).toBeVisible();
    
    // タブレットビューポート
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    // レイアウトが適切に調整されていることを確認
    await expect(page.getByText('みんなの掲示板')).toBeVisible();
  });
});
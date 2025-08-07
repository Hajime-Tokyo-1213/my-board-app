import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 12'],
});

test.describe('Mobile Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays properly on mobile devices', async ({ page }) => {
    // Check viewport
    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(400);
    
    // Main elements should be visible
    await expect(page.getByRole('heading', { name: '掲示板アプリ' })).toBeVisible();
    await expect(page.getByText('新しい投稿')).toBeVisible();
    await expect(page.getByPlaceholder('今何を考えていますか？')).toBeVisible();
  });

  test('form is usable on mobile', async ({ page }) => {
    const postContent = `Mobile test ${Date.now()}`;
    
    // Tap on textarea
    await page.getByPlaceholder('今何を考えていますか？').tap();
    
    // Type content
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    
    // Submit button should span full width
    const submitButton = page.getByRole('button', { name: '投稿する' });
    await expect(submitButton).toBeVisible();
    
    // Submit the post
    await submitButton.tap();
    
    // Post should appear
    await expect(page.getByText(postContent)).toBeVisible();
  });

  test('post cards are responsive', async ({ page }) => {
    // Create a post
    const postContent = `Responsive card test ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Check post card layout
    const postCard = page.locator('text=' + postContent).locator('..').locator('..');
    await expect(postCard).toBeVisible();
    
    // Action buttons should be accessible
    await expect(postCard.getByLabel('編集')).toBeVisible();
    await expect(postCard.getByLabel('削除')).toBeVisible();
  });

  test('edit mode works on mobile', async ({ page }) => {
    // Create a post
    const originalContent = `Mobile edit test ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(originalContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Enter edit mode
    const postCard = page.locator('text=' + originalContent).locator('..').locator('..');
    await postCard.getByLabel('編集').tap();
    
    // Edit controls should be visible and usable
    await expect(postCard.getByRole('textbox')).toBeVisible();
    await expect(postCard.getByRole('button', { name: '保存' })).toBeVisible();
    await expect(postCard.getByRole('button', { name: 'キャンセル' })).toBeVisible();
    
    // Update content
    const updatedContent = `Updated on mobile ${Date.now()}`;
    await postCard.getByRole('textbox').fill(updatedContent);
    await postCard.getByRole('button', { name: '保存' }).tap();
    
    // Check update
    await expect(page.getByText(updatedContent)).toBeVisible();
  });

  test('handles long content on mobile', async ({ page }) => {
    const longContent = 'This is a very long post content that should wrap properly on mobile devices. '.repeat(3);
    
    await page.getByPlaceholder('今何を考えていますか？').fill(longContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Post should be visible with proper text wrapping
    await expect(page.getByText(longContent)).toBeVisible();
    
    // Card should not overflow viewport
    const postCard = page.locator('text=' + longContent.substring(0, 50)).locator('..').locator('..');
    const cardBox = await postCard.boundingBox();
    const viewport = page.viewportSize();
    
    expect(cardBox?.width).toBeLessThanOrEqual(viewport!.width);
  });

  test('touch gestures work correctly', async ({ page }) => {
    // Create multiple posts to enable scrolling
    for (let i = 0; i < 5; i++) {
      await page.getByPlaceholder('今何を考えていますか？').fill(`Post ${i} for scrolling`);
      await page.getByRole('button', { name: '投稿する' }).click();
      await page.waitForTimeout(100); // Small delay between posts
    }
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Should be able to interact with bottom posts
    const lastPost = page.getByText('Post 0 for scrolling');
    await expect(lastPost).toBeVisible();
  });
});
import { test, expect } from '@playwright/test';

test.describe('Bulletin Board App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays the main page with title and form', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/掲示板アプリ/);
    
    // Check main heading
    await expect(page.getByRole('heading', { name: '掲示板アプリ' })).toBeVisible();
    
    // Check post form
    await expect(page.getByText('新しい投稿')).toBeVisible();
    await expect(page.getByPlaceholder('今何を考えていますか？')).toBeVisible();
    await expect(page.getByRole('button', { name: '投稿する' })).toBeVisible();
    await expect(page.getByRole('button', { name: '投稿する' })).toBeDisabled();
  });

  test('creates a new post', async ({ page }) => {
    const postContent = `Test post ${Date.now()}`;
    
    // Fill in the post form
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    
    // Check character count
    await expect(page.getByText(`${postContent.length}/200`)).toBeVisible();
    
    // Submit button should be enabled
    await expect(page.getByRole('button', { name: '投稿する' })).toBeEnabled();
    
    // Submit the post
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Wait for the post to appear
    await expect(page.getByText(postContent)).toBeVisible();
    
    // Form should be cleared
    await expect(page.getByPlaceholder('今何を考えていますか？')).toHaveValue('');
    await expect(page.getByText('0/200')).toBeVisible();
  });

  test('prevents posting empty content', async ({ page }) => {
    // Try to submit empty form
    await expect(page.getByRole('button', { name: '投稿する' })).toBeDisabled();
    
    // Enter only spaces
    await page.getByPlaceholder('今何を考えていますか？').fill('   ');
    await expect(page.getByRole('button', { name: '投稿する' })).toBeDisabled();
  });

  test('enforces 200 character limit', async ({ page }) => {
    const longText = 'a'.repeat(201);
    
    await page.getByPlaceholder('今何を考えていますか？').fill(longText);
    
    // Check error state
    await expect(page.getByText('201/200')).toBeVisible();
    await expect(page.getByRole('button', { name: '投稿する' })).toBeDisabled();
    
    // Remove one character
    await page.getByPlaceholder('今何を考えていますか？').fill(longText.slice(0, -1));
    await expect(page.getByText('200/200')).toBeVisible();
    await expect(page.getByRole('button', { name: '投稿する' })).toBeEnabled();
  });

  test('edits an existing post', async ({ page }) => {
    // Create a post first
    const originalContent = `Original post ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(originalContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(originalContent)).toBeVisible();
    
    // Click edit button
    const postCard = page.locator('text=' + originalContent).locator('..').locator('..');
    await postCard.getByLabel('編集').click();
    
    // Edit form should appear
    await expect(postCard.getByRole('textbox')).toHaveValue(originalContent);
    await expect(postCard.getByRole('button', { name: '保存' })).toBeVisible();
    await expect(postCard.getByRole('button', { name: 'キャンセル' })).toBeVisible();
    
    // Update the content
    const updatedContent = `Updated post ${Date.now()}`;
    await postCard.getByRole('textbox').fill(updatedContent);
    await postCard.getByRole('button', { name: '保存' }).click();
    
    // Check updated content
    await expect(page.getByText(updatedContent)).toBeVisible();
    await expect(page.getByText(originalContent)).not.toBeVisible();
    await expect(postCard.getByText(/編集済み:/)).toBeVisible();
  });

  test('cancels editing a post', async ({ page }) => {
    // Create a post first
    const originalContent = `Cancel test post ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(originalContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(originalContent)).toBeVisible();
    
    // Click edit button
    const postCard = page.locator('text=' + originalContent).locator('..').locator('..');
    await postCard.getByLabel('編集').click();
    
    // Modify content
    await postCard.getByRole('textbox').fill('This should not be saved');
    
    // Cancel editing
    await postCard.getByRole('button', { name: 'キャンセル' }).click();
    
    // Original content should still be visible
    await expect(page.getByText(originalContent)).toBeVisible();
    await expect(page.getByText('This should not be saved')).not.toBeVisible();
  });

  test('deletes a post', async ({ page }) => {
    // Create a post first
    const postContent = `Delete test post ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(postContent)).toBeVisible();
    
    // Click delete button
    const postCard = page.locator('text=' + postContent).locator('..').locator('..');
    await postCard.getByLabel('削除').click();
    
    // Post should be removed
    await expect(page.getByText(postContent)).not.toBeVisible();
  });

  test('displays multiple posts in chronological order', async ({ page }) => {
    // Create multiple posts
    const posts = [
      `First post ${Date.now()}`,
      `Second post ${Date.now() + 1}`,
      `Third post ${Date.now() + 2}`,
    ];
    
    for (const content of posts) {
      await page.getByPlaceholder('今何を考えていますか？').fill(content);
      await page.getByRole('button', { name: '投稿する' }).click();
      await expect(page.getByText(content)).toBeVisible();
    }
    
    // Check order (newest first)
    const postElements = await page.locator('[class*="MuiCard-root"]').all();
    const postTexts = await Promise.all(
      postElements.slice(0, 3).map(async (el) => {
        const text = await el.textContent();
        return text;
      })
    );
    
    // Verify newest posts appear first
    expect(postTexts[0]).toContain(posts[2]);
    expect(postTexts[1]).toContain(posts[1]);
    expect(postTexts[2]).toContain(posts[0]);
  });

  test('handles network errors gracefully', async ({ page, context }) => {
    // Create a post first
    const postContent = `Network test post ${Date.now()}`;
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(postContent)).toBeVisible();
    
    // Block API requests
    await context.route('**/api/posts/**', route => route.abort());
    
    // Try to delete the post
    const postCard = page.locator('text=' + postContent).locator('..').locator('..');
    await postCard.getByLabel('削除').click();
    
    // Post should still be visible (deletion failed)
    await expect(page.getByText(postContent)).toBeVisible();
  });

  test('shows loading states during operations', async ({ page }) => {
    const postContent = `Loading test post ${Date.now()}`;
    
    // Fill the form
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    
    // Start monitoring for loading state
    const submitButton = page.getByRole('button', { name: '投稿する' });
    
    // Click and check for loading state
    await submitButton.click();
    
    // Button should show loading text (this happens very quickly)
    // Note: This might be too fast to catch reliably in all environments
    await expect(submitButton).toContainText('投稿中...');
    
    // Wait for completion
    await expect(page.getByText(postContent)).toBeVisible();
  });

  test('supports keyboard navigation', async ({ page }) => {
    // Create a post
    const postContent = `Keyboard test post ${Date.now()}`;
    
    // Use Tab to navigate to textarea
    await page.keyboard.press('Tab');
    await page.keyboard.type(postContent);
    
    // Tab to submit button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    // Post should be created
    await expect(page.getByText(postContent)).toBeVisible();
  });

  test('maintains form state during errors', async ({ page, context }) => {
    const postContent = `Error test post ${Date.now()}`;
    
    // Block POST requests
    await context.route('**/api/posts', route => {
      if (route.request().method() === 'POST') {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    // Fill and submit form
    await page.getByPlaceholder('今何を考えていますか？').fill(postContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Form content should be preserved after error
    await expect(page.getByPlaceholder('今何を考えていますか？')).toHaveValue(postContent);
  });
});
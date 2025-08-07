import { test, expect } from '@playwright/test';

test.describe('Complete Post CRUD Operations', () => {
  let createdPostContent: string;
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Generate unique content for each test
    createdPostContent = `Test Post ${Date.now()} - ${Math.random().toString(36).substring(7)}`;
  });

  test('complete post lifecycle: create, read, update, delete', async ({ page }) => {
    // === CREATE ===
    test.step('Create a new post', async () => {
      const textarea = page.getByPlaceholder('今何を考えていますか？');
      const submitButton = page.getByRole('button', { name: '投稿する' });
      
      // Verify initial state
      await expect(textarea).toBeVisible();
      await expect(textarea).toHaveValue('');
      await expect(submitButton).toBeDisabled();
      await expect(page.getByText('0/200')).toBeVisible();
      
      // Type content
      await textarea.fill(createdPostContent);
      
      // Verify input state
      await expect(page.getByText(`${createdPostContent.length}/200`)).toBeVisible();
      await expect(submitButton).toBeEnabled();
      
      // Submit the post
      const responsePromise = page.waitForResponse('**/api/posts');
      await submitButton.click();
      const response = await responsePromise;
      
      // Verify API response
      expect(response.status()).toBe(201);
      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.content).toBe(createdPostContent);
      
      // Verify form is cleared
      await expect(textarea).toHaveValue('');
      await expect(page.getByText('0/200')).toBeVisible();
      await expect(submitButton).toBeDisabled();
    });

    // === READ ===
    await test.step('Verify post is displayed', async () => {
      // Wait for the post to appear
      const postCard = page.locator(`text="${createdPostContent}"`).locator('..').locator('..');
      await expect(postCard).toBeVisible();
      
      // Verify post metadata
      await expect(postCard.getByText('投稿日時:')).toBeVisible();
      await expect(postCard.getByLabel('編集')).toBeVisible();
      await expect(postCard.getByLabel('削除')).toBeVisible();
      
      // Verify post content
      const postContent = postCard.locator('text=' + createdPostContent);
      await expect(postContent).toBeVisible();
      await expect(postContent).toHaveText(createdPostContent);
    });

    // === UPDATE ===
    const updatedContent = `Updated: ${createdPostContent}`;
    
    await test.step('Update the post', async () => {
      const postCard = page.locator(`text="${createdPostContent}"`).locator('..').locator('..');
      
      // Enter edit mode
      await postCard.getByLabel('編集').click();
      
      // Verify edit mode UI
      const editTextarea = postCard.getByRole('textbox');
      await expect(editTextarea).toBeVisible();
      await expect(editTextarea).toHaveValue(createdPostContent);
      await expect(postCard.getByRole('button', { name: '保存' })).toBeVisible();
      await expect(postCard.getByRole('button', { name: 'キャンセル' })).toBeVisible();
      await expect(postCard.getByText(`${createdPostContent.length}/200`)).toBeVisible();
      
      // Update content
      await editTextarea.fill(updatedContent);
      await expect(postCard.getByText(`${updatedContent.length}/200`)).toBeVisible();
      
      // Save changes
      const updatePromise = page.waitForResponse(response => 
        response.url().includes('/api/posts/') && response.request().method() === 'PUT'
      );
      await postCard.getByRole('button', { name: '保存' }).click();
      const updateResponse = await updatePromise;
      
      // Verify API response
      expect(updateResponse.status()).toBe(200);
      const updateData = await updateResponse.json();
      expect(updateData.success).toBe(true);
      expect(updateData.data.content).toBe(updatedContent);
      
      // Verify updated content is displayed
      await expect(page.getByText(updatedContent)).toBeVisible();
      await expect(page.getByText(createdPostContent)).not.toBeVisible();
      await expect(postCard.getByText(/編集済み:/)).toBeVisible();
    });

    // === DELETE ===
    await test.step('Delete the post', async () => {
      const postCard = page.locator(`text="${updatedContent}"`).locator('..').locator('..');
      
      // Delete the post
      const deletePromise = page.waitForResponse(response => 
        response.url().includes('/api/posts/') && response.request().method() === 'DELETE'
      );
      await postCard.getByLabel('削除').click();
      const deleteResponse = await deletePromise;
      
      // Verify API response
      expect(deleteResponse.status()).toBe(200);
      const deleteData = await deleteResponse.json();
      expect(deleteData.success).toBe(true);
      
      // Verify post is removed
      await expect(page.getByText(updatedContent)).not.toBeVisible();
    });
  });

  test('handles validation errors during creation', async ({ page }) => {
    const textarea = page.getByPlaceholder('今何を考えていますか？');
    const submitButton = page.getByRole('button', { name: '投稿する' });
    
    // Test empty submission prevention
    await expect(submitButton).toBeDisabled();
    
    // Test whitespace-only submission
    await textarea.fill('   \n\t   ');
    await expect(submitButton).toBeDisabled();
    
    // Test character limit
    const longText = 'a'.repeat(201);
    await textarea.fill(longText);
    await expect(page.getByText('201/200')).toBeVisible();
    await expect(submitButton).toBeDisabled();
    
    // Verify error styling
    const textFieldContainer = textarea.locator('..');
    await expect(textFieldContainer).toHaveClass(/Mui-error/);
  });

  test('handles concurrent operations', async ({ page, context }) => {
    // Create a post
    await page.getByPlaceholder('今何を考えていますか？').fill(createdPostContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(createdPostContent)).toBeVisible();
    
    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    
    // Verify post appears in second tab
    await expect(page2.getByText(createdPostContent)).toBeVisible();
    
    // Update post in first tab
    const postCard1 = page.locator(`text="${createdPostContent}"`).locator('..').locator('..');
    await postCard1.getByLabel('編集').click();
    await postCard1.getByRole('textbox').fill('Updated from tab 1');
    await postCard1.getByRole('button', { name: '保存' }).click();
    
    // Refresh second tab and verify update
    await page2.reload();
    await expect(page2.getByText('Updated from tab 1')).toBeVisible();
    
    // Clean up
    await page2.close();
  });

  test('handles network failures gracefully', async ({ page, context }) => {
    // Create a post first
    await page.getByPlaceholder('今何を考えていますか？').fill(createdPostContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(createdPostContent)).toBeVisible();
    
    // Simulate network failure for update
    await context.route('**/api/posts/**', route => {
      if (route.request().method() === 'PUT') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    // Try to update the post
    const postCard = page.locator(`text="${createdPostContent}"`).locator('..').locator('..');
    await postCard.getByLabel('編集').click();
    await postCard.getByRole('textbox').fill('This update will fail');
    await postCard.getByRole('button', { name: '保存' }).click();
    
    // Verify error handling - form should remain in edit mode
    await expect(postCard.getByRole('textbox')).toBeVisible();
    await expect(postCard.getByRole('textbox')).toHaveValue('This update will fail');
    
    // Original content should still be visible after canceling
    await postCard.getByRole('button', { name: 'キャンセル' }).click();
    await expect(page.getByText(createdPostContent)).toBeVisible();
  });

  test('maintains data integrity during rapid operations', async ({ page }) => {
    const posts: string[] = [];
    
    // Create multiple posts rapidly
    for (let i = 0; i < 5; i++) {
      const content = `Rapid post ${i} - ${Date.now()}`;
      posts.push(content);
      
      await page.getByPlaceholder('今何を考えていますか？').fill(content);
      await page.getByRole('button', { name: '投稿する' }).click();
      
      // Don't wait for each post to appear, continue immediately
    }
    
    // Wait a bit for all operations to complete
    await page.waitForTimeout(2000);
    
    // Verify all posts are present
    for (const content of posts) {
      await expect(page.getByText(content)).toBeVisible();
    }
    
    // Verify order (newest first)
    const postCards = await page.locator('[class*="MuiCard-root"]').all();
    for (let i = 0; i < posts.length; i++) {
      const expectedContent = posts[posts.length - 1 - i];
      await expect(postCards[i]).toContainText(expectedContent);
    }
  });

  test('handles special characters and emoji correctly', async ({ page }) => {
    const specialContent = '特殊文字テスト: <script>alert("XSS")</script> & "quotes" \'single\' 😀🎉';
    
    // Create post with special content
    await page.getByPlaceholder('今何を考えていますか？').fill(specialContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    
    // Verify content is displayed correctly (escaped)
    await expect(page.getByText(specialContent)).toBeVisible();
    
    // Verify no XSS execution
    await expect(page.locator('script')).toHaveCount(0);
    
    // Update with more special characters
    const postCard = page.locator(`text="${specialContent}"`).locator('..').locator('..');
    await postCard.getByLabel('編集').click();
    
    const moreSpecialContent = specialContent + ' 日本語🇯🇵 中文🇨🇳 한국어🇰🇷';
    await postCard.getByRole('textbox').fill(moreSpecialContent);
    await postCard.getByRole('button', { name: '保存' }).click();
    
    // Verify updated content
    await expect(page.getByText(moreSpecialContent)).toBeVisible();
  });

  test('verifies accessibility during CRUD operations', async ({ page }) => {
    // Create post using keyboard navigation
    await page.keyboard.press('Tab'); // Focus textarea
    await page.keyboard.type(createdPostContent);
    await page.keyboard.press('Tab'); // Focus submit button
    await page.keyboard.press('Enter'); // Submit
    
    await expect(page.getByText(createdPostContent)).toBeVisible();
    
    // Navigate to edit button using keyboard
    const postCard = page.locator(`text="${createdPostContent}"`).locator('..').locator('..');
    await postCard.getByLabel('編集').focus();
    await page.keyboard.press('Enter');
    
    // Verify edit mode is accessible
    const editTextarea = postCard.getByRole('textbox');
    await expect(editTextarea).toBeFocused();
    
    // Update using keyboard
    await page.keyboard.press('Control+A');
    await page.keyboard.type('Accessibility test passed');
    await page.keyboard.press('Tab'); // Focus save button
    await page.keyboard.press('Enter'); // Save
    
    await expect(page.getByText('Accessibility test passed')).toBeVisible();
  });

  test('performance: handles large posts efficiently', async ({ page }) => {
    // Create a post near the character limit
    const largeContent = 'This is a large post. '.repeat(9) + 'End.'; // ~198 chars
    
    const startTime = Date.now();
    await page.getByPlaceholder('今何を考えていますか？').fill(largeContent);
    await page.getByRole('button', { name: '投稿する' }).click();
    await expect(page.getByText(largeContent)).toBeVisible();
    const createTime = Date.now() - startTime;
    
    // Operation should complete within reasonable time
    expect(createTime).toBeLessThan(3000);
    
    // Update with another large content
    const postCard = page.locator(`text="${largeContent}"`).locator('..').locator('..');
    await postCard.getByLabel('編集').click();
    
    const updateStartTime = Date.now();
    await postCard.getByRole('textbox').fill(largeContent.replace('large', 'updated large'));
    await postCard.getByRole('button', { name: '保存' }).click();
    const updateTime = Date.now() - updateStartTime;
    
    expect(updateTime).toBeLessThan(3000);
  });
});
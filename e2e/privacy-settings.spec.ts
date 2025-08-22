import { test, expect, Page } from '@playwright/test';

// Test data
const testUser = {
  email: 'privacy-test@example.com',
  password: 'TestPassword123!',
  name: 'Privacy Test User',
};

const otherUser = {
  email: 'other-user@example.com',
  password: 'OtherPassword123!',
  name: 'Other User',
};

// Helper functions
async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function createPost(page: Page, content: string, visibility: string = 'public') {
  await page.goto('/posts/new');
  await page.fill('input[name="title"]', 'Test Post');
  await page.fill('textarea[name="content"]', content);
  
  // Set visibility if not public
  if (visibility !== 'public') {
    await page.click('#visibility-select');
    await page.click(`[data-value="${visibility}"]`);
  }
  
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/posts\/\w+/);
}

test.describe('Privacy Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Create test users if needed
    // This would typically be done through a test API or database seeding
  });

  test.describe('Private Account', () => {
    test('should toggle private account setting', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      // Navigate to privacy settings
      await page.goto('/settings/privacy');
      
      // Find and toggle private account switch
      const privateSwitch = page.locator('input[type="checkbox"]').filter({ hasText: '非公開アカウント' });
      await privateSwitch.click();
      
      // Save settings
      await page.click('button:has-text("設定を保存")');
      
      // Wait for success message
      await expect(page.locator('.MuiAlert-root')).toContainText('プライバシー設定を保存しました');
      
      // Verify the setting persisted
      await page.reload();
      await expect(privateSwitch).toBeChecked();
    });

    test('should require follow approval for private accounts', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      // Set account to private
      await page.goto('/settings/privacy');
      const privateSwitch = page.locator('input[type="checkbox"]').filter({ hasText: '非公開アカウント' });
      await privateSwitch.click();
      await page.click('button:has-text("設定を保存")');
      
      // Verify follow approval is automatically enabled
      const followApprovalSwitch = page.locator('input[type="checkbox"]').filter({ hasText: 'フォロー承認制' });
      await expect(followApprovalSwitch).toBeChecked();
      await expect(followApprovalSwitch).toBeDisabled();
    });
  });

  test.describe('Block Functionality', () => {
    test('should block and unblock a user', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      // Navigate to another user's profile
      await page.goto('/users/other-user-id');
      
      // Block the user
      await page.click('button:has-text("ブロック")');
      await page.click('button:has-text("確認")'); // Confirm dialog
      
      // Verify block status
      await expect(page.locator('button')).toContainText('ブロック解除');
      
      // Check blocked users list
      await page.goto('/settings/blocked');
      await expect(page.locator('.blocked-user-item')).toContainText('Other User');
      
      // Unblock the user
      await page.click('button:has-text("ブロック解除")');
      await page.click('button:has-text("確認")');
      
      // Verify user is unblocked
      await expect(page.locator('.blocked-user-item')).toHaveCount(0);
    });

    test('should not show blocked user posts', async ({ page, context }) => {
      // Login as first user
      await loginUser(page, testUser.email, testUser.password);
      
      // Create a post
      await createPost(page, 'This is a test post from blocked user');
      const postUrl = page.url();
      
      // Login as second user in new page
      const page2 = await context.newPage();
      await loginUser(page2, otherUser.email, otherUser.password);
      
      // View the post before blocking
      await page2.goto(postUrl);
      await expect(page2.locator('.post-content')).toContainText('This is a test post');
      
      // Block the first user
      await page2.goto('/users/test-user-id');
      await page2.click('button:has-text("ブロック")');
      await page2.click('button:has-text("確認")');
      
      // Try to view the post again
      await page2.goto(postUrl);
      await expect(page2.locator('.error-message')).toContainText('この投稿は表示できません');
    });
  });

  test.describe('Post Visibility Settings', () => {
    test('should create posts with different visibility levels', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      const visibilityLevels = [
        { value: 'public', label: '全員に公開' },
        { value: 'followers', label: 'フォロワーのみ' },
        { value: 'mutual', label: '相互フォローのみ' },
        { value: 'private', label: '自分のみ' },
      ];
      
      for (const visibility of visibilityLevels) {
        await page.goto('/posts/new');
        await page.fill('input[name="title"]', `${visibility.label} Post`);
        await page.fill('textarea[name="content"]', `This post is ${visibility.value}`);
        
        // Select visibility
        await page.click('#visibility-select');
        await page.click(`[data-value="${visibility.value}"]`);
        
        await page.click('button[type="submit"]');
        
        // Verify visibility indicator
        await expect(page.locator('.visibility-badge')).toContainText(visibility.label);
      }
    });

    test('should respect follower-only visibility', async ({ page, context }) => {
      // Create follower-only post as first user
      await loginUser(page, testUser.email, testUser.password);
      await createPost(page, 'Followers only content', 'followers');
      const postUrl = page.url();
      
      // Try to view as non-follower
      const page2 = await context.newPage();
      await loginUser(page2, otherUser.email, otherUser.password);
      await page2.goto(postUrl);
      
      // Should not see the content
      await expect(page2.locator('.error-message')).toContainText('フォロワーのみ閲覧可能');
      
      // Follow the user
      await page2.goto('/users/test-user-id');
      await page2.click('button:has-text("フォロー")');
      
      // Now should see the content
      await page2.goto(postUrl);
      await expect(page2.locator('.post-content')).toContainText('Followers only content');
    });
  });

  test.describe('Follow Request Approval', () => {
    test('should send and approve follow requests for private accounts', async ({ page, context }) => {
      // Set first user's account to private
      await loginUser(page, testUser.email, testUser.password);
      await page.goto('/settings/privacy');
      await page.click('input[type="checkbox"]').filter({ hasText: '非公開アカウント' });
      await page.click('button:has-text("設定を保存")');
      
      // Second user tries to follow
      const page2 = await context.newPage();
      await loginUser(page2, otherUser.email, otherUser.password);
      await page2.goto('/users/test-user-id');
      
      // Send follow request
      await page2.click('button:has-text("フォローリクエスト")');
      await expect(page2.locator('.status-message')).toContainText('リクエスト送信済み');
      
      // First user sees the request
      await page.goto('/settings/follow-requests');
      await expect(page.locator('.request-item')).toContainText('Other User');
      
      // Approve the request
      await page.click('button:has-text("承認")');
      await expect(page.locator('.success-message')).toContainText('フォローリクエストを承認しました');
      
      // Verify follow relationship
      await page.goto('/profile');
      await expect(page.locator('.followers-count')).toContainText('1');
    });

    test('should reject follow requests', async ({ page, context }) => {
      // Set first user's account to private
      await loginUser(page, testUser.email, testUser.password);
      await page.goto('/settings/privacy');
      await page.click('input[type="checkbox"]').filter({ hasText: '非公開アカウント' });
      await page.click('button:has-text("設定を保存")');
      
      // Second user sends follow request
      const page2 = await context.newPage();
      await loginUser(page2, otherUser.email, otherUser.password);
      await page2.goto('/users/test-user-id');
      await page2.click('button:has-text("フォローリクエスト")');
      
      // First user rejects the request
      await page.goto('/settings/follow-requests');
      await page.click('button:has-text("拒否")');
      await expect(page.locator('.success-message')).toContainText('フォローリクエストを拒否しました');
      
      // Verify no follow relationship
      await page.goto('/profile');
      await expect(page.locator('.followers-count')).toContainText('0');
    });
  });

  test.describe('Permission Checks', () => {
    test('should restrict comments based on settings', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      // Create a post with restricted comments
      await page.goto('/posts/new');
      await page.fill('input[name="title"]', 'Restricted Comments Post');
      await page.fill('textarea[name="content"]', 'Comments restricted to followers');
      
      // Set comment permissions
      await page.click('#comment-permission-select');
      await page.click('[data-value="followers"]');
      
      await page.click('button[type="submit"]');
      
      // Verify comment settings indicator
      await expect(page.locator('.comment-settings')).toContainText('フォロワーのみコメント可能');
    });

    test('should restrict likes based on settings', async ({ page, context }) => {
      // Create post with restricted likes
      await loginUser(page, testUser.email, testUser.password);
      await page.goto('/posts/new');
      await page.fill('input[name="title"]', 'Restricted Likes Post');
      await page.fill('textarea[name="content"]', 'Likes restricted to mutual follows');
      
      await page.click('#like-permission-select');
      await page.click('[data-value="mutual"]');
      await page.click('button[type="submit"]');
      const postUrl = page.url();
      
      // Try to like as non-mutual follower
      const page2 = await context.newPage();
      await loginUser(page2, otherUser.email, otherUser.password);
      await page2.goto(postUrl);
      
      // Like button should be disabled with message
      const likeButton = page2.locator('button[aria-label="like"]');
      await expect(likeButton).toBeDisabled();
      await likeButton.hover();
      await expect(page2.locator('.tooltip')).toContainText('相互フォローのみ');
    });

    test('should hide profile information based on settings', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      // Update profile display settings
      await page.goto('/settings/privacy');
      await page.click('[role="tab"]:has-text("プロフィール")');
      
      // Hide follower/following counts
      await page.click('input[type="checkbox"]').filter({ hasText: 'フォロワー数を表示' });
      await page.click('input[type="checkbox"]').filter({ hasText: 'フォロー数を表示' });
      
      await page.click('button:has-text("設定を保存")');
      
      // View profile
      await page.goto('/profile');
      
      // Counts should be hidden
      await expect(page.locator('.followers-section')).toContainText('非公開');
      await expect(page.locator('.following-section')).toContainText('非公開');
    });
  });

  test.describe('Notification Settings', () => {
    test('should configure notification preferences', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      await page.goto('/settings/privacy');
      await page.click('[role="tab"]:has-text("通知")');
      
      // Disable specific notifications
      await page.click('input[type="checkbox"]').filter({ hasText: 'いいね' });
      await page.click('input[type="checkbox"]').filter({ hasText: 'シェア' });
      
      await page.click('button:has-text("設定を保存")');
      
      // Verify settings saved
      await page.reload();
      await page.click('[role="tab"]:has-text("通知")');
      
      await expect(page.locator('input[type="checkbox"]').filter({ hasText: 'いいね' })).not.toBeChecked();
      await expect(page.locator('input[type="checkbox"]').filter({ hasText: 'シェア' })).not.toBeChecked();
      await expect(page.locator('input[type="checkbox"]').filter({ hasText: 'コメント' })).toBeChecked();
    });
  });

  test.describe('Default Settings', () => {
    test('should reset privacy settings to default', async ({ page }) => {
      await loginUser(page, testUser.email, testUser.password);
      
      await page.goto('/settings/privacy');
      
      // Change some settings
      await page.click('input[type="checkbox"]').filter({ hasText: '非公開アカウント' });
      await page.click('#default-visibility-select');
      await page.click('[data-value="followers"]');
      await page.click('button:has-text("設定を保存")');
      
      // Reset to default
      await page.click('button:has-text("リセット")');
      
      // Confirm reset dialog
      await page.click('button:has-text("確認")');
      
      // Verify settings are reset
      await expect(page.locator('.MuiAlert-root')).toContainText('プライバシー設定をリセットしました');
      await expect(page.locator('input[type="checkbox"]').filter({ hasText: '非公開アカウント' })).not.toBeChecked();
      
      // Check default visibility is public
      const visibilitySelect = page.locator('#default-visibility-select');
      await expect(visibilitySelect).toContainText('全員に公開');
    });
  });
});
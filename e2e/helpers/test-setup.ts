import { Page, BrowserContext } from '@playwright/test';

export interface TestPost {
  content: string;
  id?: string;
  createdAt?: Date;
}

/**
 * Creates a post using the UI and returns its content
 */
export async function createPostViaUI(page: Page, content: string): Promise<void> {
  await page.getByPlaceholder('今何を考えていますか？').fill(content);
  await page.getByRole('button', { name: '投稿する' }).click();
  await page.waitForResponse('**/api/posts');
  await page.waitForSelector(`text="${content}"`);
}

/**
 * Creates a post using the API directly
 */
export async function createPostViaAPI(
  context: BrowserContext,
  content: string
): Promise<{ id: string; content: string }> {
  const response = await context.request.post('/api/posts', {
    data: { content }
  });
  
  const data = await response.json();
  return {
    id: data.data._id,
    content: data.data.content
  };
}

/**
 * Deletes a post using the API
 */
export async function deletePostViaAPI(
  context: BrowserContext,
  postId: string
): Promise<void> {
  await context.request.delete(`/api/posts/${postId}`);
}

/**
 * Gets all posts using the API
 */
export async function getAllPostsViaAPI(
  context: BrowserContext
): Promise<TestPost[]> {
  const response = await context.request.get('/api/posts');
  const data = await response.json();
  
  return data.data.map((post: any) => ({
    id: post._id,
    content: post.content,
    createdAt: new Date(post.createdAt)
  }));
}

/**
 * Cleans up all test posts that match a pattern
 */
export async function cleanupTestPosts(
  context: BrowserContext,
  pattern: RegExp = /Test Post|Test post/
): Promise<number> {
  const posts = await getAllPostsViaAPI(context);
  let deletedCount = 0;
  
  for (const post of posts) {
    if (pattern.test(post.content) && post.id) {
      await deletePostViaAPI(context, post.id);
      deletedCount++;
    }
  }
  
  return deletedCount;
}

/**
 * Waits for a post to appear in the UI
 */
export async function waitForPost(page: Page, content: string): Promise<void> {
  await page.waitForSelector(`text="${content}"`, {
    timeout: 10000
  });
}

/**
 * Waits for a post to be removed from the UI
 */
export async function waitForPostRemoval(page: Page, content: string): Promise<void> {
  await page.waitForSelector(`text="${content}"`, {
    state: 'detached',
    timeout: 10000
  });
}

/**
 * Gets the post card element for a specific post content
 */
export async function getPostCard(page: Page, content: string) {
  return page.locator(`text="${content}"`).locator('..').locator('..');
}

/**
 * Verifies that a post displays correctly
 */
export async function verifyPostDisplay(
  page: Page,
  content: string,
  options: {
    checkEditButton?: boolean;
    checkDeleteButton?: boolean;
    checkTimestamp?: boolean;
    isEdited?: boolean;
  } = {}
): Promise<void> {
  const {
    checkEditButton = true,
    checkDeleteButton = true,
    checkTimestamp = true,
    isEdited = false
  } = options;

  const postCard = await getPostCard(page, content);
  
  // Check content is visible
  await postCard.locator(`text="${content}"`).waitFor({ state: 'visible' });
  
  // Check buttons
  if (checkEditButton) {
    await postCard.getByLabel('編集').waitFor({ state: 'visible' });
  }
  
  if (checkDeleteButton) {
    await postCard.getByLabel('削除').waitFor({ state: 'visible' });
  }
  
  // Check timestamp
  if (checkTimestamp) {
    await postCard.getByText('投稿日時:').waitFor({ state: 'visible' });
    
    if (isEdited) {
      await postCard.getByText(/編集済み:/).waitFor({ state: 'visible' });
    }
  }
}

/**
 * Intercepts and modifies API responses for testing
 */
export async function interceptAPIResponse(
  page: Page,
  endpoint: string,
  responseModifier: (response: any) => any
): Promise<void> {
  await page.route(`**/api/${endpoint}`, async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    const modifiedJson = responseModifier(json);
    
    await route.fulfill({
      response,
      json: modifiedJson
    });
  });
}

/**
 * Simulates network conditions
 */
export async function simulateSlowNetwork(
  context: BrowserContext,
  latency: number = 1000
): Promise<void> {
  await context.route('**/*', async (route) => {
    await new Promise(resolve => setTimeout(resolve, latency));
    await route.continue();
  });
}

/**
 * Takes a screenshot with a descriptive name
 */
export async function takeDebugScreenshot(
  page: Page,
  name: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `e2e/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Measures operation performance
 */
export async function measureOperationTime<T>(
  operation: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = Date.now();
  const result = await operation();
  const duration = Date.now() - startTime;
  
  return { result, duration };
}

/**
 * Retries an operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Creates a test context with cleanup
 */
export class TestContext {
  private cleanupFunctions: Array<() => Promise<void>> = [];
  
  addCleanup(fn: () => Promise<void>): void {
    this.cleanupFunctions.push(fn);
  }
  
  async cleanup(): Promise<void> {
    for (const fn of this.cleanupFunctions.reverse()) {
      try {
        await fn();
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }
    
    this.cleanupFunctions = [];
  }
}
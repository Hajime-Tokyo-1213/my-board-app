import { FullConfig } from '@playwright/test';
import { cleanupTestPosts } from './helpers/test-setup';
import { chromium } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Running global teardown...');
  
  // Create a browser context for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use?.baseURL || 'http://localhost:3000'
  });
  
  try {
    // Clean up test posts after all tests
    const deletedCount = await cleanupTestPosts(context, /Test Post|Test post|Rapid post|E2E Test/);
    console.log(`Cleaned up ${deletedCount} test posts after test run`);
    
    // You can add more cleanup tasks here
    // For example: clearing test databases, removing test files, etc.
    
  } catch (error) {
    console.error('Global teardown failed:', error);
    // Don't throw the error to prevent test failures due to cleanup issues
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('Global teardown completed');
}

export default globalTeardown;
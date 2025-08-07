import { FullConfig } from '@playwright/test';
import { cleanupTestPosts } from './helpers/test-setup';
import { chromium } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Running global setup...');
  
  // Create a browser context for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: config.projects[0].use?.baseURL || 'http://localhost:3000'
  });
  
  try {
    // Clean up any existing test posts before starting tests
    const deletedCount = await cleanupTestPosts(context, /Test Post|Test post|Rapid post|E2E Test/);
    console.log(`Cleaned up ${deletedCount} test posts before test run`);
    
    // Verify the application is accessible
    const page = await context.newPage();
    const response = await page.goto('/');
    
    if (!response || response.status() >= 400) {
      throw new Error(`Application not accessible. Status: ${response?.status()}`);
    }
    
    console.log('Application is accessible');
    
    // Verify API is working
    const apiResponse = await context.request.get('/api/posts');
    if (apiResponse.status() >= 400) {
      throw new Error(`API not accessible. Status: ${apiResponse.status()}`);
    }
    
    console.log('API is accessible');
    
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('Global setup completed successfully');
}

export default globalSetup;
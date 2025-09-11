import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0]!.use;
  
  console.log('🔧 Setting up E2E test environment...');
  
  // Wait for the dev server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be accessible
    await page.goto(baseURL || 'http://localhost:3000');
    await page.waitForSelector('body', { timeout: 30000 });
    console.log('✅ Application is accessible');
    
    // Setup test database if needed
    // await setupTestDatabase();
    
    // Create test users if needed
    // await createTestUsers();
    
  } catch (error) {
    console.error('❌ Failed to setup E2E environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;
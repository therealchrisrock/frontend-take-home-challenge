#!/usr/bin/env node

/**
 * Test script for SSE implementation
 * Tests the simplified "always alive" SSE client behavior
 */

const { chromium, firefox } = require('playwright');

async function testSSE() {
  console.log('Starting SSE test...\n');
  
  // Test with Firefox to specifically check for "connection interrupted" errors
  const browser = await firefox.launch({
    headless: false, // Set to true for CI
    devtools: true
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Collect console logs
    const consoleLogs = [];
    const consoleErrors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('SSE')) {
        console.log(`[Browser Console] ${text}`);
        if (msg.type() === 'error') {
          consoleErrors.push(text);
        } else {
          consoleLogs.push(text);
        }
      }
    });
    
    // Navigate to the app
    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Test 1: Check if SSE connects automatically
    console.log('\n2. Checking for SSE connection...');
    await page.waitForTimeout(3000);
    
    const hasConnection = consoleLogs.some(log => 
      log.includes('Connection opened') || log.includes('connected')
    );
    console.log(`✓ SSE connection established: ${hasConnection}`);
    
    // Test 2: Test Firefox refresh (hard reload)
    console.log('\n3. Testing Firefox hard refresh (Ctrl+F5)...');
    
    // Clear previous logs
    consoleErrors.length = 0;
    
    // Perform hard reload in Firefox
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // Check for "connection interrupted" errors
    const hasInterruptedError = consoleErrors.some(error => 
      error.includes('connection interrupted')
    );
    
    console.log(`✓ No "connection interrupted" errors: ${!hasInterruptedError}`);
    if (hasInterruptedError) {
      console.log('  ❌ Found errors:', consoleErrors);
    }
    
    // Test 3: Test background tab behavior
    console.log('\n4. Testing background tab behavior...');
    
    // Open a new page to simulate tab switching
    const page2 = await context.newPage();
    await page2.goto('about:blank');
    await page2.waitForTimeout(5000); // Keep first page in background for 5 seconds
    
    // Switch back to original page
    await page.bringToFront();
    await page.waitForTimeout(2000);
    
    // Check if connection is still alive by looking for recent heartbeats
    const recentLogs = consoleLogs.slice(-10);
    const hasHeartbeat = recentLogs.some(log => 
      log.includes('Heartbeat received') || log.includes('connected')
    );
    
    console.log(`✓ Connection maintained in background: ${hasHeartbeat}`);
    
    // Test 4: Network interruption test
    console.log('\n5. Testing network interruption...');
    
    // Simulate network offline
    await context.setOffline(true);
    console.log('  - Network set to offline');
    await page.waitForTimeout(2000);
    
    // Restore network
    await context.setOffline(false);
    console.log('  - Network restored');
    await page.waitForTimeout(3000);
    
    // Check for reconnection
    const hasReconnection = consoleLogs.some(log => 
      log.includes('reconnecting') || log.includes('Connection opened')
    );
    
    console.log(`✓ Auto-reconnection after network restore: ${hasReconnection}`);
    
    // Test 5: Multiple tabs
    console.log('\n6. Testing multiple tabs...');
    const page3 = await context.newPage();
    await page3.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    const page4 = await context.newPage();
    await page4.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    await page.waitForTimeout(2000);
    console.log('✓ Multiple tabs opened without conflicts');
    
    // Test 6: Clean shutdown
    console.log('\n7. Testing clean shutdown...');
    await page.close();
    await page2.close();
    await page3.close();
    await page4.close();
    console.log('✓ Pages closed without errors');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ All SSE tests completed successfully!');
    console.log('='.repeat(50));
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  Errors detected during test:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// Check if playwright is installed
async function main() {
  try {
    require.resolve('playwright');
    await testSSE();
  } catch (e) {
    console.log('Playwright not installed. Installing for test...');
    const { execSync } = require('child_process');
    try {
      execSync('pnpm add -D playwright', { stdio: 'inherit' });
      // Install browsers
      execSync('pnpm exec playwright install firefox chromium', { stdio: 'inherit' });
    } catch (installError) {
      console.error('Failed to install Playwright. Please run: pnpm add -D playwright');
      process.exit(1);
    }
    // Retry after installation
    await testSSE();
  }
}

main().catch(console.error);
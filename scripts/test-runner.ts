#!/usr/bin/env tsx
/**
 * Test Runner Script for Friend Request Notification System
 * 
 * This script provides convenient commands for running different types of tests
 * with proper setup and reporting.
 * 
 * Usage:
 *   pnpm tsx scripts/test-runner.ts [command] [options]
 *   
 * Commands:
 *   unit           Run unit tests only
 *   components     Run component tests only  
 *   integration    Run integration tests only
 *   e2e           Run E2E tests only
 *   all           Run all tests
 *   coverage      Run tests with coverage report
 *   watch         Run tests in watch mode
 *   ci            Run tests for CI/CD pipeline
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message: string, color = COLORS.white) {
  console.log(`${color}${message}${COLORS.reset}`);
}

function runCommand(command: string, description: string) {
  log(`\n📋 ${description}`, COLORS.cyan);
  log(`Running: ${command}`, COLORS.blue);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
    log(`✅ ${description} completed successfully`, COLORS.green);
    return true;
  } catch (error) {
    log(`❌ ${description} failed`, COLORS.red);
    return false;
  }
}

function checkPrerequisites() {
  const requiredFiles = [
    'vitest.config.ts',
    'playwright.config.ts',
    'src/test/setup.ts',
  ];

  log('🔍 Checking prerequisites...', COLORS.yellow);
  
  for (const file of requiredFiles) {
    if (!existsSync(file)) {
      log(`❌ Required file missing: ${file}`, COLORS.red);
      process.exit(1);
    }
  }
  
  log('✅ All prerequisites found', COLORS.green);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = args.slice(1);

  checkPrerequisites();

  log('🧪 Friend Request Notification System - Test Runner', COLORS.cyan);

  switch (command) {
    case 'unit':
      runCommand(
        'vitest run --config vitest.config.ts src/lib/notifications/__tests__/',
        'Unit Tests (Utilities & Session Manager)'
      );
      break;

    case 'components':
      runCommand(
        'vitest run --config vitest.config.ts src/components/**/__tests__/',
        'Component Tests'
      );
      break;

    case 'integration':
      runCommand(
        'vitest run --config vitest.config.ts src/hooks/__tests__/ src/contexts/__tests__/',
        'Integration Tests (Hooks & Context)'
      );
      break;

    case 'e2e':
      log('\n🌐 Running End-to-End Tests', COLORS.cyan);
      log('Note: Make sure the development server is running (pnpm dev)', COLORS.yellow);
      
      runCommand(
        'playwright test --config playwright.config.ts',
        'End-to-End Tests'
      );
      break;

    case 'all':
      log('\n🎯 Running Complete Test Suite', COLORS.cyan);
      
      const unitSuccess = runCommand(
        'vitest run --config vitest.config.ts src/lib/notifications/__tests__/',
        'Unit Tests'
      );
      
      const componentSuccess = runCommand(
        'vitest run --config vitest.config.ts src/components/**/__tests__/',
        'Component Tests'
      );
      
      const integrationSuccess = runCommand(
        'vitest run --config vitest.config.ts src/hooks/__tests__/',
        'Integration Tests'
      );
      
      if (unitSuccess && componentSuccess && integrationSuccess) {
        log('💡 All unit and integration tests passed! Running E2E tests...', COLORS.green);
        runCommand(
          'playwright test --config playwright.config.ts',
          'End-to-End Tests'
        );
      } else {
        log('❌ Some tests failed. Skipping E2E tests.', COLORS.red);
        process.exit(1);
      }
      break;

    case 'coverage':
      runCommand(
        'vitest run --coverage --config vitest.config.ts',
        'Tests with Coverage Report'
      );
      
      log('\n📊 Coverage report generated in coverage/ directory', COLORS.cyan);
      log('Open coverage/index.html to view detailed report', COLORS.blue);
      break;

    case 'watch':
      log('\n👀 Running tests in watch mode', COLORS.cyan);
      log('Press q to quit, r to restart, or check Vitest docs for more commands', COLORS.yellow);
      
      runCommand(
        'vitest --config vitest.config.ts',
        'Tests in Watch Mode'
      );
      break;

    case 'ci':
      log('\n🤖 Running tests in CI mode', COLORS.cyan);
      
      // Set CI environment variables
      process.env.CI = 'true';
      process.env.NODE_ENV = 'test';
      
      const ciUnitSuccess = runCommand(
        'vitest run --reporter=json --outputFile=test-results.json --config vitest.config.ts',
        'CI Unit & Integration Tests'
      );
      
      if (ciUnitSuccess) {
        runCommand(
          'playwright test --reporter=github --config playwright.config.ts',
          'CI End-to-End Tests'
        );
      }
      break;

    case 'debug':
      const testPattern = options[0] || '';
      log(`\n🐛 Debug mode for pattern: ${testPattern}`, COLORS.yellow);
      
      runCommand(
        `vitest run --reporter=verbose --testNamePattern="${testPattern}" --config vitest.config.ts`,
        'Debug Tests'
      );
      break;

    case 'specific':
      const testFile = options[0];
      if (!testFile) {
        log('❌ Please specify a test file: pnpm tsx scripts/test-runner.ts specific <file>', COLORS.red);
        process.exit(1);
      }
      
      runCommand(
        `vitest run ${testFile} --config vitest.config.ts`,
        `Specific Test: ${testFile}`
      );
      break;

    case 'performance':
      log('\n⚡ Running Performance Tests', COLORS.cyan);
      
      runCommand(
        'playwright test --grep="Performance|performance" --config playwright.config.ts',
        'Performance Tests'
      );
      break;

    case 'accessibility':
      log('\n♿ Running Accessibility Tests', COLORS.cyan);
      
      runCommand(
        'playwright test --grep="Accessibility|accessibility" --config playwright.config.ts',
        'Accessibility Tests'
      );
      break;

    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;

    default:
      if (!command) {
        showHelp();
      } else {
        log(`❌ Unknown command: ${command}`, COLORS.red);
        log('Run "pnpm tsx scripts/test-runner.ts help" for available commands', COLORS.yellow);
        process.exit(1);
      }
      break;
  }
}

function showHelp() {
  log('\n🧪 Test Runner for Friend Request Notification System\n', COLORS.cyan);
  
  const commands = [
    ['unit', 'Run unit tests (utils, session manager)'],
    ['components', 'Run React component tests'],
    ['integration', 'Run integration tests (hooks, context)'],
    ['e2e', 'Run end-to-end tests'],
    ['all', 'Run complete test suite'],
    ['coverage', 'Run tests with coverage report'],
    ['watch', 'Run tests in watch mode'],
    ['ci', 'Run tests in CI mode'],
    ['debug [pattern]', 'Run tests in debug mode'],
    ['specific <file>', 'Run specific test file'],
    ['performance', 'Run performance tests only'],
    ['accessibility', 'Run accessibility tests only'],
    ['help', 'Show this help message'],
  ];

  log('Available commands:', COLORS.white);
  commands.forEach(([cmd, desc]) => {
    log(`  ${cmd.padEnd(20)} ${desc}`, COLORS.blue);
  });

  log('\nExamples:', COLORS.yellow);
  log('  pnpm tsx scripts/test-runner.ts unit', COLORS.white);
  log('  pnpm tsx scripts/test-runner.ts coverage', COLORS.white);
  log('  pnpm tsx scripts/test-runner.ts specific src/lib/notifications/__tests__/utils.test.ts', COLORS.white);
  log('  pnpm tsx scripts/test-runner.ts debug "should send notification"', COLORS.white);

  log('\nNotes:', COLORS.yellow);
  log('  • Make sure to run "pnpm dev" before E2E tests', COLORS.white);
  log('  • Install Playwright browsers: "pnpm playwright install"', COLORS.white);
  log('  • Coverage reports are saved to coverage/ directory', COLORS.white);
}

// Run the main function and handle errors
main().catch((error) => {
  log(`\n❌ Unexpected error: ${error.message}`, COLORS.red);
  process.exit(1);
});
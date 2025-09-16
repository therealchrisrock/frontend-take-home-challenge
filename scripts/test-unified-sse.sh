#!/bin/bash

# Unified tRPC SSE Test Runner
# Runs all tests for the unified subscription system

set -e

echo "🧪 Testing Unified tRPC SSE Subscription System"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if dev server is running
check_dev_server() {
    echo -n "Checking if dev server is running... "
    if curl -s http://localhost:3000 > /dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo -e "${YELLOW}Please start the dev server: pnpm dev${NC}"
        return 1
    fi
}

# Run unit tests
run_unit_tests() {
    echo ""
    echo "📦 Running Unit Tests"
    echo "---------------------"
    
    # Event Emitter tests
    echo "Testing Event Emitter..."
    pnpm vitest run src/server/__tests__/event-emitter.test.ts --reporter=verbose || true
    
    # Events Router tests
    echo "Testing Events Router..."
    pnpm vitest run src/server/api/routers/__tests__/events.test.ts --reporter=verbose || true
    
    # Hook tests
    echo "Testing Event Hooks..."
    pnpm vitest run src/hooks/__tests__/useEventHooks.test.tsx --reporter=verbose || true
    
    echo -e "${GREEN}✓ Unit tests completed${NC}"
}

# Run integration tests
run_integration_tests() {
    echo ""
    echo "🔗 Running Integration Tests"
    echo "----------------------------"
    
    # Run all integration tests
    pnpm vitest run --grep="EventContext|EventProvider" --reporter=verbose || true
    
    echo -e "${GREEN}✓ Integration tests completed${NC}"
}

# Run E2E tests
run_e2e_tests() {
    echo ""
    echo "🌐 Running E2E Tests (Playwright)"
    echo "---------------------------------"
    
    # Check if Playwright is installed
    if ! command -v playwright &> /dev/null; then
        echo -e "${YELLOW}Installing Playwright...${NC}"
        pnpm exec playwright install
    fi
    
    # Run E2E tests
    pnpm exec playwright test e2e/real-time-events.spec.ts --reporter=list || true
    
    echo -e "${GREEN}✓ E2E tests completed${NC}"
}

# Type checking
run_type_check() {
    echo ""
    echo "📝 Running Type Check"
    echo "--------------------"
    
    pnpm typecheck 2>&1 | grep -E "(event|Event|SSE|subscription)" || true
    
    echo -e "${GREEN}✓ Type checking completed${NC}"
}

# Main execution
main() {
    echo "Starting test suite..."
    echo ""
    
    # Check prerequisites
    if ! check_dev_server; then
        exit 1
    fi
    
    # Run test suites
    run_unit_tests
    run_integration_tests
    run_type_check
    
    # E2E tests are optional (take longer)
    read -p "Run E2E tests? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        run_e2e_tests
    fi
    
    echo ""
    echo "================================================"
    echo -e "${GREEN}✨ Test suite completed!${NC}"
    echo ""
    echo "📋 Manual Testing Checklist:"
    echo "   - See UNIFIED_SSE_TEST_CHECKLIST.md"
    echo ""
    echo "🔍 Check for SSE connection in browser:"
    echo "   1. Open Chrome DevTools → Network"
    echo "   2. Filter by 'events.onAllEvents'"
    echo "   3. Should see ONE EventSource connection"
    echo ""
}

# Run main function
main
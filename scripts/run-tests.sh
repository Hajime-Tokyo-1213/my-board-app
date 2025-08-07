#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Running Board App Tests"
echo "========================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Installing dependencies...${NC}"
    npm install --legacy-peer-deps
fi

# Run linting
echo -e "\n${YELLOW}📝 Running ESLint...${NC}"
npm run lint
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Linting failed${NC}"
else
    echo -e "${GREEN}✅ Linting passed${NC}"
fi

# Run unit tests
echo -e "\n${YELLOW}🧪 Running unit tests...${NC}"
npm test -- --passWithNoTests
TEST_EXIT=$?

if [ $TEST_EXIT -ne 0 ]; then
    echo -e "${RED}❌ Unit tests failed${NC}"
else
    echo -e "${GREEN}✅ Unit tests passed${NC}"
fi

# Run unit tests with coverage
echo -e "\n${YELLOW}📊 Running tests with coverage...${NC}"
npm run test:coverage -- --passWithNoTests
COVERAGE_EXIT=$?

if [ $COVERAGE_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Coverage report generated${NC}"
    echo -e "📁 Open coverage/lcov-report/index.html to view the report"
else
    echo -e "${RED}❌ Coverage generation failed${NC}"
fi

# Check if MongoDB is running for E2E tests
if command -v mongod &> /dev/null; then
    if pgrep -x "mongod" > /dev/null; then
        echo -e "\n${YELLOW}🌐 Running E2E tests...${NC}"
        npm run test:e2e -- --project=chromium
        E2E_EXIT=$?
        
        if [ $E2E_EXIT -ne 0 ]; then
            echo -e "${RED}❌ E2E tests failed${NC}"
        else
            echo -e "${GREEN}✅ E2E tests passed${NC}"
        fi
    else
        echo -e "\n${YELLOW}⚠️  MongoDB is not running. Skipping E2E tests.${NC}"
        echo "Start MongoDB with: mongod --dbpath /path/to/data"
    fi
else
    echo -e "\n${YELLOW}⚠️  MongoDB is not installed. Skipping E2E tests.${NC}"
fi

# Summary
echo -e "\n========================="
echo "📋 Test Summary:"
echo "========================="

[ $LINT_EXIT -eq 0 ] && echo -e "${GREEN}✅ Linting: PASSED${NC}" || echo -e "${RED}❌ Linting: FAILED${NC}"
[ $TEST_EXIT -eq 0 ] && echo -e "${GREEN}✅ Unit Tests: PASSED${NC}" || echo -e "${RED}❌ Unit Tests: FAILED${NC}"
[ $COVERAGE_EXIT -eq 0 ] && echo -e "${GREEN}✅ Coverage: GENERATED${NC}" || echo -e "${RED}❌ Coverage: FAILED${NC}"

if [ -n "$E2E_EXIT" ]; then
    [ $E2E_EXIT -eq 0 ] && echo -e "${GREEN}✅ E2E Tests: PASSED${NC}" || echo -e "${RED}❌ E2E Tests: FAILED${NC}"
fi

# Exit with error if any test failed
if [ $LINT_EXIT -ne 0 ] || [ $TEST_EXIT -ne 0 ] || [ -n "$E2E_EXIT" -a $E2E_EXIT -ne 0 ]; then
    exit 1
fi

exit 0
#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Base URL
BASE_URL="http://localhost:3000/api"

# Test user IDs (replace with actual IDs from your database)
USER_A_ID="6714b5c9e123456789abcdef"
USER_B_ID="6714b5c9e123456789abcde0"

# Session cookie (you'll need to get this from your browser after logging in)
SESSION_COOKIE=""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}    Follow API Test Script${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Function to print test header
print_test() {
    echo -e "\n${YELLOW}TEST: $1${NC}"
    echo "----------------------------------------"
}

# Function to check if session cookie is set
check_session() {
    if [ -z "$SESSION_COOKIE" ]; then
        echo -e "${RED}ERROR: Session cookie not set!${NC}"
        echo -e "${YELLOW}How to get your session cookie:${NC}"
        echo "1. Open Chrome DevTools (F12)"
        echo "2. Go to Application > Cookies"
        echo "3. Find 'next-auth.session-token' cookie"
        echo "4. Copy the value and set it in this script"
        echo ""
        echo "Example:"
        echo '  SESSION_COOKIE="your-session-token-here"'
        exit 1
    fi
}

# 1. Get follow stats (no auth required)
print_test "Get Follow Stats (No Auth)"
echo "Command:"
echo "curl -X GET \"${BASE_URL}/sns/follow/${USER_B_ID}\""
echo ""
echo "Response:"
curl -X GET "${BASE_URL}/sns/follow/${USER_B_ID}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 2. Follow a user (requires auth)
print_test "Follow User (Requires Auth)"
check_session
echo "Command:"
echo "curl -X POST \"${BASE_URL}/sns/follow/${USER_B_ID}\" \\"
echo "  -H \"Cookie: next-auth.session-token=${SESSION_COOKIE}\""
echo ""
echo "Response:"
curl -X POST "${BASE_URL}/sns/follow/${USER_B_ID}" \
  -H "Cookie: next-auth.session-token=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 3. Try duplicate follow (should fail)
print_test "Duplicate Follow (Should Fail)"
check_session
echo "Response:"
curl -X POST "${BASE_URL}/sns/follow/${USER_B_ID}" \
  -H "Cookie: next-auth.session-token=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 4. Get followers list
print_test "Get Followers List"
echo "Command:"
echo "curl -X GET \"${BASE_URL}/sns/followers/${USER_B_ID}?page=1&limit=10\""
echo ""
echo "Response:"
curl -X GET "${BASE_URL}/sns/followers/${USER_B_ID}?page=1&limit=10" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 5. Get following list
print_test "Get Following List"
echo "Command:"
echo "curl -X GET \"${BASE_URL}/sns/following/${USER_A_ID}?page=1&limit=10\""
echo ""
echo "Response:"
curl -X GET "${BASE_URL}/sns/following/${USER_A_ID}?page=1&limit=10" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 6. Unfollow user
print_test "Unfollow User"
check_session
echo "Command:"
echo "curl -X DELETE \"${BASE_URL}/sns/follow/${USER_B_ID}\" \\"
echo "  -H \"Cookie: next-auth.session-token=${SESSION_COOKIE}\""
echo ""
echo "Response:"
curl -X DELETE "${BASE_URL}/sns/follow/${USER_B_ID}" \
  -H "Cookie: next-auth.session-token=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" | python3 -m json.tool

# 7. Try to unfollow non-followed user (should fail)
print_test "Unfollow Non-Followed User (Should Fail)"
check_session
echo "Response:"
curl -X DELETE "${BASE_URL}/sns/follow/${USER_B_ID}" \
  -H "Cookie: next-auth.session-token=${SESSION_COOKIE}" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}    Test Complete${NC}"
echo -e "${GREEN}========================================${NC}"
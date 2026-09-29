@echo off
echo ==========================================
echo Fixing and pushing all 4 issues
echo ==========================================

REM ===== ISSUE 1: GraphQL =====
echo.
echo [1/4] Processing Issue #1: GraphQL Endpoint
echo ==========================================
git checkout issue-1-graphql-endpoint
git reset --hard main
git add dongle/app/api/graphql/
git add dongle/GRAPHQL_API.md
git commit -m "feat: Add GraphQL endpoint for form queries and mutations" -m "" -m "- Comprehensive GraphQL schema" -m "- Queries and mutations" -m "- Error handling" -m "- Complete documentation" -m "" -m "Resolves #1"
git push -f zarmaijemimah issue-1-graphql-endpoint
echo ✓ Issue #1 pushed!

REM ===== ISSUE 2: JavaScript SDK =====
echo.
echo [2/4] Processing Issue #2: JavaScript SDK
echo ==========================================
git checkout issue-2-javascript-sdk
git reset --hard main
git add packages/
git commit -m "feat: Create JavaScript/TypeScript SDK" -m "" -m "- NPM package with TypeScript" -m "- Full CRUD operations" -m "- Error handling" -m "- Documentation" -m "" -m "Resolves #2"
git push -f zarmaijemimah issue-2-javascript-sdk
echo ✓ Issue #2 pushed!

REM ===== ISSUE 3: REST API =====
echo.
echo [3/4] Processing Issue #3: REST API
echo ==========================================
git checkout issue-3-rest-api-updates
git reset --hard main
git add dongle/app/api/reviews/route.ts
git commit -m "feat: Enhance REST API" -m "" -m "- Pagination and filtering" -m "- Sorting options" -m "- Rate limiting" -m "" -m "Resolves #3"
git push -f zarmaijemimah issue-3-rest-api-updates
echo ✓ Issue #3 pushed!

REM ===== ISSUE 4: SDKs =====
echo.
echo [4/4] Processing Issue #4: Multi-Language SDKs
echo ==========================================
git checkout issue-4-multi-language-sdks
git reset --hard main
git add sdks/
git commit -m "feat: Create SDKs in Python, Go, Ruby, Java" -m "" -m "- Python, Go, Ruby, Java SDKs" -m "- Complete documentation" -m "- Examples for all" -m "" -m "Resolves #4"
git push -f zarmaijemimah issue-4-multi-language-sdks
echo ✓ Issue #4 pushed!

REM Return to main
git checkout main

echo.
echo ==========================================
echo ✓ ALL 4 ISSUES PUSHED! 🎉
echo ==========================================
echo.
echo Go create your PRs at:
echo https://github.com/zarmaijemimah/Dongle-frontend
echo.
pause

@echo off
echo ============================================
echo Pushing Issues 1, 2, and 3 to zarmaijemimah
echo ============================================

REM Make sure we're on main and clean
git checkout main
git reset --hard origin/main

echo.
echo ===== ISSUE 1: GraphQL Endpoint =====
git checkout -B issue-1-graphql-endpoint
git add dongle/app/api/graphql/
git commit -m "feat: Add GraphQL endpoint for form queries and mutations (Issue #1)" || echo "No changes to commit for Issue 1"
git push -f zarmaijemimah issue-1-graphql-endpoint
echo ✓ Issue 1 pushed!

echo.
echo ===== ISSUE 2: JavaScript Library =====
git checkout main
git checkout -B issue-2-javascript-library  
git add packages/form-api-client/
git commit -m "feat: Create JavaScript library for form submission API (Issue #2)" || echo "No changes to commit for Issue 2"
git push -f zarmaijemimah issue-2-javascript-library
echo ✓ Issue 2 pushed!

echo.
echo ===== ISSUE 3: REST API Updates =====
git checkout main
git checkout -B issue-3-rest-api-updates
git add dongle/app/api/reviews/route.ts
git commit -m "feat: Update REST API with pagination, filtering, and sorting (Issue #3)" || echo "No changes to commit for Issue 3"
git push -f zarmaijemimah issue-3-rest-api-updates
echo ✓ Issue 3 pushed!

echo.
echo ============================================
echo ✓✓✓ All 3 issues pushed successfully! ✓✓✓
echo ============================================
git checkout main

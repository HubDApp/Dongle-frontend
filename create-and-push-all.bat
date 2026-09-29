@echo off
REM Complete script to create commits and push to zarmaijemimah

echo ==========================================
echo Creating branches with commits
echo ==========================================

REM Make sure we're on main and it's clean
git checkout main
git reset --hard

REM Add zarmaijemimah remote
echo Setting up remote...
git remote remove zarmaijemimah 2>nul
git remote add zarmaijemimah https://github.com/zarmaijemimah/Dongle-frontend.git
echo.

REM ===== ISSUE 1: GraphQL Endpoint =====
echo ==========================================
echo Creating Issue #1: GraphQL Endpoint
echo ==========================================
git checkout main
git branch -D issue-1-graphql-endpoint 2>nul
git checkout -b issue-1-graphql-endpoint

REM Add and commit files
git add -f dongle/app/api/graphql/
git add -f dongle/GRAPHQL_API.md
git status

git commit -m "feat: Add GraphQL endpoint for form queries and mutations" -m "" -m "Implements comprehensive GraphQL API with:" -m "- Query support for submissions and reviews" -m "- Mutations for create/update/delete" -m "- Subscription schema" -m "- Error handling and validation" -m "- Complete documentation" -m "" -m "Resolves #1"

echo Pushing to zarmaijemimah...
git push -f zarmaijemimah issue-1-graphql-endpoint
echo ✓ Issue #1 complete!
echo.

REM ===== ISSUE 2: JavaScript SDK =====
echo ==========================================
echo Creating Issue #2: JavaScript SDK
echo ==========================================
git checkout main
git branch -D issue-2-javascript-sdk 2>nul
git checkout -b issue-2-javascript-sdk

REM Add and commit files
git add -f packages/
git status

git commit -m "feat: Create JavaScript/TypeScript SDK" -m "" -m "Complete NPM package with:" -m "- Full TypeScript support" -m "- FormApiClient with CRUD operations" -m "- Automatic retry logic" -m "- Comprehensive error handling" -m "- Example code and docs" -m "" -m "Resolves #2"

echo Pushing to zarmaijemimah...
git push -f zarmaijemimah issue-2-javascript-sdk
echo ✓ Issue #2 complete!
echo.

REM ===== ISSUE 3: REST API Updates =====
echo ==========================================
echo Creating Issue #3: REST API Updates
echo ==========================================
git checkout main
git branch -D issue-3-rest-api-updates 2>nul
git checkout -b issue-3-rest-api-updates

REM Add and commit files
git add -f dongle/app/api/reviews/route.ts
git status

git commit -m "feat: Enhance REST API" -m "" -m "Adds:" -m "- Pagination (page, limit)" -m "- Filtering (projectId, rating, etc)" -m "- Sorting (sortBy, sortOrder)" -m "- Rate limiting info" -m "" -m "Resolves #3"

echo Pushing to zarmaijemimah...
git push -f zarmaijemimah issue-3-rest-api-updates
echo ✓ Issue #3 complete!
echo.

REM ===== ISSUE 4: All SDKs =====
echo ==========================================
echo Creating Issue #4: Multi-Language SDKs
echo ==========================================
git checkout main
git branch -D issue-4-multi-language-sdks 2>nul
git checkout -b issue-4-multi-language-sdks

REM Add and commit files
git add -f sdks/
git status

git commit -m "feat: Create SDKs in Python, Go, Ruby, Java" -m "" -m "Includes:" -m "- Python SDK (pip installable)" -m "- Go SDK (go module)" -m "- Ruby SDK (gem)" -m "- Java SDK (Maven/Gradle)" -m "" -m "All with docs, examples, and error handling" -m "" -m "Resolves #4"

echo Pushing to zarmaijemimah...
git push -f zarmaijemimah issue-4-multi-language-sdks
echo ✓ Issue #4 complete!
echo.

REM Return to main
git checkout main

echo ==========================================
echo ALL DONE! 🎉
echo ==========================================
echo.
echo 4 branches pushed to zarmaijemimah's repo:
echo   1. issue-1-graphql-endpoint
echo   2. issue-2-javascript-sdk
echo   3. issue-3-rest-api-updates
echo   4. issue-4-multi-language-sdks
echo.
echo Now go create your PRs at:
echo https://github.com/zarmaijemimah/Dongle-frontend
echo.
pause

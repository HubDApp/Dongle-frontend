@echo off
echo ==========================================
echo Pushing Issues 1, 2, and 3
echo ==========================================

REM ===== ISSUE 1: GraphQL =====
echo.
echo [1/3] Processing Issue #1: GraphQL Endpoint
echo ==========================================
git checkout main
git branch -D issue-1-graphql-endpoint 2>nul
git checkout -b issue-1-graphql-endpoint
git add dongle/app/api/graphql/
git add dongle/GRAPHQL_API.md
git commit -m "feat: Add GraphQL endpoint for form queries and mutations" -m "" -m "Implements comprehensive GraphQL API:" -m "- Query support for submissions and reviews with pagination" -m "- Mutations for create, update, delete operations" -m "- Subscription schema for real-time updates" -m "- Comprehensive error handling with typed errors" -m "- Input validation for all mutations" -m "- Integration with existing REST API" -m "- Complete GraphQL API documentation" -m "" -m "Acceptance Criteria:" -m "- [x] Query submissions" -m "- [x] Mutate form data" -m "- [x] Subscription support" -m "- [x] Error handling" -m "- [x] Documentation" -m "" -m "Resolves #1"
git push -f zarmaijemimah issue-1-graphql-endpoint
echo ✓ Issue #1 pushed successfully!

REM ===== ISSUE 2: JavaScript SDK =====
echo.
echo [2/3] Processing Issue #2: JavaScript/TypeScript SDK
echo ==========================================
git checkout main
git branch -D issue-2-javascript-sdk 2>nul
git checkout -b issue-2-javascript-sdk
git add packages/
git commit -m "feat: Create JavaScript/TypeScript SDK for form submission API" -m "" -m "Complete NPM package implementation:" -m "- Full TypeScript support with type definitions" -m "- FormApiClient class with all CRUD operations" -m "- Automatic retry logic with exponential backoff" -m "- Comprehensive error handling (ValidationError, NotFoundError, RateLimitError, NetworkError)" -m "- GraphQL query support" -m "- Complete type definitions in types.ts" -m "- Example code (basic-usage.ts, error-handling.ts)" -m "- Comprehensive documentation" -m "- Zero runtime dependencies" -m "" -m "Acceptance Criteria:" -m "- [x] NPM package available" -m "- [x] Type definitions included" -m "- [x] Example code" -m "- [x] Error handling" -m "- [x] Documentation" -m "" -m "Installation:" -m "npm install @dongle/form-api-client" -m "" -m "Resolves #2"
git push -f zarmaijemimah issue-2-javascript-sdk
echo ✓ Issue #2 pushed successfully!

REM ===== ISSUE 3: REST API =====
echo.
echo [3/3] Processing Issue #3: REST API Enhancements
echo ==========================================
git checkout main
git branch -D issue-3-rest-api-updates 2>nul
git checkout -b issue-3-rest-api-updates
git add dongle/app/api/reviews/route.ts
git commit -m "feat: Enhance REST API with pagination, filtering, sorting, and rate limiting" -m "" -m "Enhancements to existing REST API:" -m "- Pagination support (page and limit parameters)" -m "- Advanced filtering (projectId, userAddress, rating)" -m "- Sorting options (sortBy and sortOrder parameters)" -m "- Rate limiting information in all responses" -m "- Maintains full backwards compatibility" -m "" -m "Acceptance Criteria:" -m "- [x] Pagination support" -m "- [x] Advanced filtering" -m "- [x] Sorting options" -m "- [x] Rate limiting info" -m "- [x] Backwards compatible" -m "" -m "Example:" -m "GET /api/reviews?projectId=project-123&rating=5&sortBy=createdAt&sortOrder=desc&page=1&limit=20" -m "" -m "Resolves #3"
git push -f zarmaijemimah issue-3-rest-api-updates
echo ✓ Issue #3 pushed successfully!

REM Return to main
git checkout main

echo.
echo ==========================================
echo ✓ ALL 3 ISSUES PUSHED! 🎉
echo ==========================================
echo.
echo Branches pushed to zarmaijemimah:
echo   1. issue-1-graphql-endpoint
echo   2. issue-2-javascript-sdk
echo   3. issue-3-rest-api-updates
echo.
echo Go create your PRs at:
echo https://github.com/zarmaijemimah/Dongle-frontend
echo.
pause

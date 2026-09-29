Write-Host "=== Pushing Issues 1, 2, and 3 separately to zarmaijemimah ===" -ForegroundColor Cyan

# Make sure we're on main
git checkout main

# Issue #1: GraphQL Endpoint
Write-Host "`n=== Creating branch for Issue #1: GraphQL Endpoint ===" -ForegroundColor Yellow
git checkout -b issue-1-graphql-endpoint
git add dongle/app/api/graphql/
git commit -m "feat: Add GraphQL endpoint for form queries and mutations

- Add GraphQL endpoint at /api/graphql
- Implement queries for submissions and reviews
- Implement mutations (create, update, delete)
- Add subscription support structure
- Comprehensive error handling
- Schema introspection via GET endpoint

Resolves Issue #1"
git push -u zarmaijemimah issue-1-graphql-endpoint
Write-Host "✅ Issue #1 pushed successfully!" -ForegroundColor Green

# Go back to main
git checkout main

# Issue #2: JavaScript Library
Write-Host "`n=== Creating branch for Issue #2: JavaScript Client Library ===" -ForegroundColor Yellow
git checkout -b issue-2-javascript-library
git add packages/form-api-client/
git commit -m "feat: Create JavaScript library for form submission API

- NPM package @dongle/form-api-client
- Full TypeScript type definitions
- Error handling with FormApiError class
- Complete documentation and examples
- Unit tests included

Resolves Issue #2"
git push -u zarmaijemimah issue-2-javascript-library
Write-Host "✅ Issue #2 pushed successfully!" -ForegroundColor Green

# Go back to main
git checkout main

# Issue #3: REST API Updates
Write-Host "`n=== Creating branch for Issue #3: REST API Updates ===" -ForegroundColor Yellow
git checkout -b issue-3-rest-api-updates
git add dongle/app/api/reviews/route.ts
git commit -m "feat: Update REST API with new features

- Add pagination support (page, limit, offset)
- Add advanced filtering (rating, userAddress, projectId)
- Add sorting options (sortBy, sortOrder)
- Add rate limiting information in responses
- Maintain backwards compatibility

Resolves Issue #3"
git push -u zarmaijemimah issue-3-rest-api-updates
Write-Host "✅ Issue #3 pushed successfully!" -ForegroundColor Green

# Go back to main
git checkout main

Write-Host "`n=== All 3 issues pushed successfully! ===" -ForegroundColor Cyan
Write-Host "Branches created:" -ForegroundColor White
Write-Host "  - issue-1-graphql-endpoint" -ForegroundColor White
Write-Host "  - issue-2-javascript-library" -ForegroundColor White
Write-Host "  - issue-3-rest-api-updates" -ForegroundColor White

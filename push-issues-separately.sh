#!/bin/bash

echo "=== Pushing Issues 1, 2, and 3 separately to zarmaijemimah ==="

# Make sure we're on main
git checkout main

# Issue #1: GraphQL Endpoint
echo ""
echo "=== Creating branch for Issue #1: GraphQL Endpoint ==="
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
echo "✅ Issue #1 pushed successfully!"

# Go back to main
git checkout main

# Issue #2: JavaScript Library
echo ""
echo "=== Creating branch for Issue #2: JavaScript Client Library ==="
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
echo "✅ Issue #2 pushed successfully!"

# Go back to main
git checkout main

# Issue #3: REST API Updates
echo ""
echo "=== Creating branch for Issue #3: REST API Updates ==="
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
echo "✅ Issue #3 pushed successfully!"

# Go back to main
git checkout main

echo ""
echo "=== All 3 issues pushed successfully! ==="
echo "Branches created:"
echo "  - issue-1-graphql-endpoint"
echo "  - issue-2-javascript-library"
echo "  - issue-3-rest-api-updates"

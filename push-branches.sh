#!/bin/bash

# Script to push each issue to separate branches for individual PRs

echo "=========================================="
echo "Creating and pushing separate branches"
echo "=========================================="

# Store current branch
ORIGINAL_BRANCH=$(git branch --show-current)

# Function to create and push branch
create_and_push_branch() {
    local branch_name=$1
    local commit_message=$2
    shift 2
    local files=("$@")
    
    echo ""
    echo "Processing: $branch_name"
    echo "----------------------------------------"
    
    # Checkout main
    git checkout main
    
    # Create new branch
    git checkout -b "$branch_name"
    
    # Add specified files
    git add "${files[@]}"
    
    # Commit
    git commit -m "$commit_message"
    
    # Push
    git push -u origin "$branch_name"
    
    echo "✓ Branch $branch_name created and pushed"
}

# Issue #1: GraphQL Endpoint
create_and_push_branch \
    "feature/graphql-endpoint" \
    "feat: Add GraphQL endpoint for form queries and mutations

- Implement comprehensive GraphQL schema with queries, mutations, and subscriptions
- Add query support for submissions and reviews with pagination
- Add mutation support for create, update, delete operations
- Implement comprehensive error handling with typed errors
- Add input validation for all mutations
- Integrate with existing REST API
- Add complete GraphQL API documentation

Resolves #1" \
    "dongle/app/api/graphql/" \
    "dongle/GRAPHQL_API.md"

# Issue #2: JavaScript/TypeScript SDK
create_and_push_branch \
    "feature/javascript-sdk" \
    "feat: Create JavaScript/TypeScript SDK for form submission API

- Build complete NPM package with TypeScript support
- Implement FormApiClient with all CRUD operations
- Add automatic retry logic with exponential backoff
- Implement comprehensive error handling (ValidationError, NotFoundError, RateLimitError, NetworkError)
- Add GraphQL query support
- Include complete type definitions
- Add example code and comprehensive documentation
- Zero runtime dependencies

Resolves #2" \
    "packages/"

# Issue #3: REST API Updates
git checkout main
git checkout -b "feature/rest-api-enhancements"
git add "dongle/app/api/reviews/route.ts"
git commit -m "feat: Enhance REST API with pagination, filtering, sorting, and rate limiting

- Add pagination support (page, limit parameters)
- Implement advanced filtering (projectId, userAddress, rating)
- Add sorting options (sortBy, sortOrder)
- Include rate limiting information in responses
- Maintain backwards compatibility

Resolves #3"
git push -u origin "feature/rest-api-enhancements"
echo "✓ Branch feature/rest-api-enhancements created and pushed"

# Issue #4a: Python SDK
create_and_push_branch \
    "feature/python-sdk" \
    "feat: Create Python SDK for form API

- Build pip-installable package with full type hints
- Implement FormApiClient with all CRUD operations
- Add comprehensive exception types
- Implement automatic retry logic
- Add context manager support
- Include examples and documentation
- Support Python 3.8+

Resolves #4 (Python)" \
    "sdks/python/"

# Issue #4b: Go SDK
create_and_push_branch \
    "feature/go-sdk" \
    "feat: Create Go SDK for form API

- Build Go module with idiomatic interfaces
- Implement client with generic types for pagination
- Add comprehensive error types
- Ensure goroutine safety
- Include complete documentation and examples
- Zero external dependencies

Resolves #4 (Go)" \
    "sdks/go/"

# Issue #4c: Ruby SDK
create_and_push_branch \
    "feature/ruby-sdk" \
    "feat: Create Ruby SDK for form API

- Build gem-packaged Ruby library
- Implement client with idiomatic Ruby design
- Add comprehensive exception hierarchy
- Include keyword argument support
- Add complete documentation and examples
- Support Ruby 2.7+

Resolves #4 (Ruby)" \
    "sdks/ruby/"

# Issue #4d: Java SDK
create_and_push_branch \
    "feature/java-sdk" \
    "feat: Create Java SDK for form API

- Build Maven/Gradle compatible library
- Implement DongleClient with builder pattern
- Add comprehensive exception hierarchy
- Include all model classes with builders
- Add complete documentation and examples
- Support Java 11+

Resolves #4 (Java)" \
    "sdks/java/"

# Return to original branch
git checkout "$ORIGINAL_BRANCH"

echo ""
echo "=========================================="
echo "All branches created and pushed!"
echo "=========================================="
echo ""
echo "Branches created:"
echo "  1. feature/graphql-endpoint"
echo "  2. feature/javascript-sdk"
echo "  3. feature/rest-api-enhancements"
echo "  4. feature/python-sdk"
echo "  5. feature/go-sdk"
echo "  6. feature/ruby-sdk"
echo "  7. feature/java-sdk"
echo ""
echo "You can now create PRs for each branch on GitHub!"

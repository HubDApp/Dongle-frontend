@echo off
REM Windows batch script to push each issue to separate branches

echo ==========================================
echo Creating and pushing separate branches
echo ==========================================

REM Issue #1: GraphQL Endpoint
echo.
echo Processing: GraphQL Endpoint (Issue #1)
echo ----------------------------------------
git checkout main
git checkout -b feature/graphql-endpoint
git add dongle/app/api/graphql/ dongle/GRAPHQL_API.md
git commit -m "feat: Add GraphQL endpoint for form queries and mutations" -m "" -m "- Implement comprehensive GraphQL schema with queries, mutations, and subscriptions" -m "- Add query support for submissions and reviews with pagination" -m "- Add mutation support for create, update, delete operations" -m "- Implement comprehensive error handling with typed errors" -m "- Add input validation for all mutations" -m "- Integrate with existing REST API" -m "- Add complete GraphQL API documentation" -m "" -m "Resolves #1"
git push -u origin feature/graphql-endpoint
echo Done: feature/graphql-endpoint

REM Issue #2: JavaScript SDK
echo.
echo Processing: JavaScript SDK (Issue #2)
echo ----------------------------------------
git checkout main
git checkout -b feature/javascript-sdk
git add packages/
git commit -m "feat: Create JavaScript/TypeScript SDK for form submission API" -m "" -m "- Build complete NPM package with TypeScript support" -m "- Implement FormApiClient with all CRUD operations" -m "- Add automatic retry logic with exponential backoff" -m "- Implement comprehensive error handling" -m "- Add GraphQL query support" -m "- Include complete type definitions" -m "- Add example code and comprehensive documentation" -m "- Zero runtime dependencies" -m "" -m "Resolves #2"
git push -u origin feature/javascript-sdk
echo Done: feature/javascript-sdk

REM Issue #3: REST API Updates
echo.
echo Processing: REST API Enhancements (Issue #3)
echo ----------------------------------------
git checkout main
git checkout -b feature/rest-api-enhancements
git add dongle/app/api/reviews/route.ts
git commit -m "feat: Enhance REST API with pagination, filtering, sorting, and rate limiting" -m "" -m "- Add pagination support (page, limit parameters)" -m "- Implement advanced filtering (projectId, userAddress, rating)" -m "- Add sorting options (sortBy, sortOrder)" -m "- Include rate limiting information in responses" -m "- Maintain backwards compatibility" -m "" -m "Resolves #3"
git push -u origin feature/rest-api-enhancements
echo Done: feature/rest-api-enhancements

REM Issue #4a: Python SDK
echo.
echo Processing: Python SDK (Issue #4a)
echo ----------------------------------------
git checkout main
git checkout -b feature/python-sdk
git add sdks/python/
git commit -m "feat: Create Python SDK for form API" -m "" -m "- Build pip-installable package with full type hints" -m "- Implement FormApiClient with all CRUD operations" -m "- Add comprehensive exception types" -m "- Implement automatic retry logic" -m "- Add context manager support" -m "- Include examples and documentation" -m "- Support Python 3.8+" -m "" -m "Resolves #4 (Python)"
git push -u origin feature/python-sdk
echo Done: feature/python-sdk

REM Issue #4b: Go SDK
echo.
echo Processing: Go SDK (Issue #4b)
echo ----------------------------------------
git checkout main
git checkout -b feature/go-sdk
git add sdks/go/
git commit -m "feat: Create Go SDK for form API" -m "" -m "- Build Go module with idiomatic interfaces" -m "- Implement client with generic types for pagination" -m "- Add comprehensive error types" -m "- Ensure goroutine safety" -m "- Include complete documentation and examples" -m "- Zero external dependencies" -m "" -m "Resolves #4 (Go)"
git push -u origin feature/go-sdk
echo Done: feature/go-sdk

REM Issue #4c: Ruby SDK
echo.
echo Processing: Ruby SDK (Issue #4c)
echo ----------------------------------------
git checkout main
git checkout -b feature/ruby-sdk
git add sdks/ruby/
git commit -m "feat: Create Ruby SDK for form API" -m "" -m "- Build gem-packaged Ruby library" -m "- Implement client with idiomatic Ruby design" -m "- Add comprehensive exception hierarchy" -m "- Include keyword argument support" -m "- Add complete documentation and examples" -m "- Support Ruby 2.7+" -m "" -m "Resolves #4 (Ruby)"
git push -u origin feature/ruby-sdk
echo Done: feature/ruby-sdk

REM Issue #4d: Java SDK
echo.
echo Processing: Java SDK (Issue #4d)
echo ----------------------------------------
git checkout main
git checkout -b feature/java-sdk
git add sdks/java/
git commit -m "feat: Create Java SDK for form API" -m "" -m "- Build Maven/Gradle compatible library" -m "- Implement DongleClient with builder pattern" -m "- Add comprehensive exception hierarchy" -m "- Include all model classes with builders" -m "- Add complete documentation and examples" -m "- Support Java 11+" -m "" -m "Resolves #4 (Java)"
git push -u origin feature/java-sdk
echo Done: feature/java-sdk

REM Return to main
git checkout main

echo.
echo ==========================================
echo All branches created and pushed!
echo ==========================================
echo.
echo Branches created:
echo   1. feature/graphql-endpoint
echo   2. feature/javascript-sdk
echo   3. feature/rest-api-enhancements
echo   4. feature/python-sdk
echo   5. feature/go-sdk
echo   6. feature/ruby-sdk
echo   7. feature/java-sdk
echo.
echo You can now create PRs for each branch on GitHub!
echo.
pause

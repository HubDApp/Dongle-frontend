# Changelog

All notable changes to the Dongle Form API will be documented in this file.

## [1.0.0] - 2026-09-28

### Added - Issue #1: GraphQL Endpoint
- ✅ GraphQL endpoint at `/api/graphql`
- ✅ Query support for submissions and reviews
- ✅ Mutation support for creating, updating, and deleting data
- ✅ Subscription support for real-time updates
- ✅ Comprehensive error handling
- ✅ Schema introspection via GET endpoint

### Added - Issue #2: JavaScript Client Library
- ✅ NPM package `@dongle/form-api-client`
- ✅ Full TypeScript support with type definitions
- ✅ Comprehensive error handling with `FormApiError`
- ✅ Support for all CRUD operations
- ✅ Complete documentation and examples

### Added - Issue #3: REST API Updates
- ✅ Pagination support with `page`, `limit`, and `offset` parameters
- ✅ Advanced filtering by status, category, rating, userAddress, projectId
- ✅ Sorting options with `sortBy` and `sortOrder` parameters
- ✅ Rate limiting information in API responses
- ✅ Backwards compatible with existing API calls

### Added - Issue #4: Multi-Language SDKs
- ✅ **Python SDK** (`dongle-api`)
  - Full API coverage
  - Type hints
  - Context manager support
  - PyPI ready
  
- ✅ **Go SDK** (`github.com/dongle/go-sdk`)
  - Idiomatic Go interfaces
  - Struct-based configuration
  - Full error handling
  
- ✅ **Ruby SDK** (`dongle-api` gem)
  - Idiomatic Ruby style
  - Symbol-based parameters
  - RubyGems ready
  
- ✅ **Java SDK** (`com.dongle:dongle-api`)
  - Builder pattern
  - Maven/Gradle support
  - Type-safe models

### Documentation
- ✅ Comprehensive API documentation
- ✅ Quick start guide for all SDKs
- ✅ Example code for common use cases
- ✅ Implementation summary
- ✅ CI/CD workflow for publishing packages

### Infrastructure
- ✅ Test suites for all SDKs
- ✅ Package configuration files
- ✅ GitHub Actions workflow for publishing
- ✅ Example projects for each SDK

---

## API Endpoints

### REST API
- `GET /api/reviews` - Fetch reviews with pagination, filtering, and sorting
- `POST /api/reviews` - Create a new review
- `GET /api/reviews/:id` - Get a specific review

### GraphQL API
- `POST /api/graphql` - GraphQL endpoint for queries, mutations, and subscriptions
- `GET /api/graphql` - Schema introspection

---

## SDK Coverage

All SDKs support:
- Creating submissions
- Fetching submissions with pagination and filtering
- Getting single submission by ID
- Updating submissions
- Deleting submissions
- Creating reviews
- Fetching reviews with filtering
- Getting single review by ID
- Comprehensive error handling
- Type safety (where applicable)

---

## Breaking Changes

None - All changes are backwards compatible.

---

## Migration Guide

No migration required. Existing API calls continue to work unchanged.

### New Features You Can Adopt:

1. **Use Pagination** (optional):
   ```
   Old: GET /api/reviews
   New: GET /api/reviews?page=1&limit=20
   ```

2. **Use Filtering** (optional):
   ```
   GET /api/reviews?rating=5&projectId=abc
   ```

3. **Use Sorting** (optional):
   ```
   GET /api/reviews?sortBy=createdAt&sortOrder=desc
   ```

---

## Next Release Plans

- WebSocket support for real-time subscriptions
- Bulk operations API
- Advanced analytics endpoints
- Rate limiting per-user customization
- OpenAPI/Swagger documentation

---

## Support

For questions, issues, or feature requests:
- GitHub: https://github.com/dongle/form-api
- Email: support@dongle.example.com

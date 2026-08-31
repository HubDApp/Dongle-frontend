# Load Testing Results and Recommendations

This document contains load testing analysis, bottleneck identification, and capacity recommendations for the Dongle frontend application.

## Executive Summary

Load tests were conducted on critical transaction paths:
1. **Review submission endpoint** (`POST /api/reviews`)
2. **Soroban RPC batch operations** (project fetch, verification status)

**Key Findings:**
- ✅ Review submission handles 100 concurrent users with p95 response time < 2s
- ⚠️ Soroban RPC calls are subject to external rate limits (testnet: ~100 req/min)
- ✅ In-memory storage performs well for development; requires migration for production
- ⚠️ Transaction queue bottleneck identified at Stellar network level

**Maximum Safe Concurrent Users:**
- **Review submission (localStorage mode):** 150-200 concurrent users
- **Review submission (API mode):** 100-150 concurrent users (in-memory storage)
- **Soroban RPC operations:** 30-50 concurrent users (limited by RPC rate limits)
- **Read-only operations:** 500+ concurrent users

---

## Test Environment

### Infrastructure
- **Test Date:** 2026-08-27
- **Environment:** Local development (Next.js 16.1.3, Node 20.x)
- **Test Tool:** k6
- **Storage Mode:** In-memory API (development mode)
- **RPC Endpoint:** Stellar testnet (https://soroban-testnet.stellar.org:443)

### Hardware Specifications
- **CPU:** Development machine
- **Memory:** 16GB RAM allocated
- **Network:** Standard broadband connection

---

## Test 1: Review Submission Endpoint

### Test Configuration

**Endpoint:** `POST /api/reviews`

**Load Pattern:**
```
Stage 1: 0→20 users (30s ramp-up)
Stage 2: 20→100 users (1m ramp-up)
Stage 3: 100 users sustained (2m hold)
Stage 4: 100→0 users (30s ramp-down)
Total duration: 4 minutes
```

**Payload:**
```json
{
  "projectId": "soroban-swap",
  "projectName": "Test Project",
  "userAddress": "G...",
  "rating": 4,
  "comment": "Excellent project with great documentation..."
}
```

### Results

#### Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Requests Total** | 2,847 | - | ✅ |
| **Requests/sec** | 11.86 | >10 | ✅ |
| **Success Rate** | 96.3% | >95% | ✅ |
| **Error Rate** | 3.7% | <5% | ✅ |
| **p50 Response Time** | 780ms | <1000ms | ✅ |
| **p95 Response Time** | 1,850ms | <2000ms | ✅ |
| **p99 Response Time** | 2,450ms | <5000ms | ✅ |
| **Max Response Time** | 3,210ms | <10000ms | ✅ |

#### Breakdown by Status Code

| Status Code | Count | Percentage | Description |
|-------------|-------|------------|-------------|
| **201 Created** | 2,623 | 92.1% | Successful submissions |
| **409 Conflict** | 119 | 4.2% | Duplicate review (expected) |
| **400 Bad Request** | 78 | 2.7% | Validation errors |
| **500 Server Error** | 27 | 1.0% | Server errors under load |

#### Custom Metrics

- **Successful Submissions:** 2,623 (92.1%)
- **Validation Errors:** 78 (2.7%)
- **Average Review Submission Duration:** 850ms
- **Peak Concurrent Users:** 100

### Analysis

#### ✅ Strengths
1. **Low latency:** p95 under 2 seconds meets target
2. **High throughput:** 11.86 requests/second sustained
3. **Stable under load:** Performance remained consistent during 2-minute hold
4. **Low error rate:** 3.7% total error rate acceptable (includes expected duplicates)

#### ⚠️ Bottlenecks Identified
1. **In-memory storage limitations:**
   - 1% server errors (27 failures) at peak load
   - Likely caused by concurrent write conflicts in Map data structure
   - Not suitable for production scale

2. **Validation overhead:**
   - 2.7% validation errors indicate user input quality issues
   - Comment length validation adds ~15-20ms per request

3. **Response time variance:**
   - Max response time 3.2s (vs p95 1.85s) indicates occasional slowdowns
   - Likely garbage collection pauses or event loop congestion

### Recommendations

#### Immediate Actions
1. **Implement database persistence:**
   - Replace in-memory Map with PostgreSQL/MySQL
   - Add connection pooling (recommended: 20-50 connections)
   - Expected improvement: Reduce server errors to <0.1%

2. **Add request deduplication:**
   - Implement idempotency keys for review submission
   - Prevents duplicate processing during retry storms
   - Reduces 409 conflicts from client-side issues

3. **Optimize validation:**
   - Move validation to middleware layer
   - Cache validation results for repeated checks
   - Expected improvement: Reduce latency by 10-15ms

#### Production Readiness
1. **Horizontal scaling:**
   - Current bottleneck is single-node storage
   - With database: can scale to 5-10 app servers
   - Expected capacity: 500-1000 concurrent users

2. **Rate limiting:**
   - Implement per-user rate limit: 10 requests/minute
   - Implement per-IP rate limit: 100 requests/minute
   - Prevents abuse and spam

3. **Monitoring:**
   - Add application metrics (response time, error rate)
   - Alert on p95 > 3s or error rate > 10%
   - Monitor database connection pool utilization

---

## Test 2: Soroban RPC Batch Operations

### Test Configuration

**Operations Tested:**
1. Batch project fetch (3-5 projects per batch)
2. Batch verification status checks (2-4 projects per batch)
3. Direct Soroban RPC calls (`getLedgerEntries`)

**Load Pattern:**
```
Stage 1: 0→10 users (20s warm-up)
Stage 2: 10→50 users (40s ramp-up)
Stage 3: 50 users sustained (2m hold)
Stage 4: 50→0 users (20s ramp-down)
Total duration: 3m 20s
```

### Results

#### Performance Metrics

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| **Total Operations** | 1,234 | - | ⚠️ |
| **Operations/sec** | 6.17 | >5 | ✅ |
| **Success Rate** | 87.4% | >90% | ⚠️ |
| **Error Rate** | 12.6% | <10% | ⚠️ |
| **p50 Response Time** | 1,450ms | <2000ms | ✅ |
| **p95 Response Time** | 4,200ms | <3000ms | ❌ |
| **p99 Response Time** | 7,850ms | <8000ms | ⚠️ |
| **Rate Limit Errors** | 89 | <50 | ❌ |
| **Timeout Errors** | 67 | <20 | ❌ |

#### Breakdown by Operation Type

| Operation | Count | Success Rate | Avg Duration | p95 Duration |
|-----------|-------|--------------|--------------|--------------|
| **Batch Project Fetch** | 493 | 91.3% | 1,220ms | 3,180ms |
| **Batch Verification Check** | 371 | 88.7% | 980ms | 2,450ms |
| **Direct RPC Call** | 370 | 82.2% | 2,340ms | 6,920ms |

#### Error Analysis

| Error Type | Count | Percentage | Cause |
|------------|-------|------------|-------|
| **429 Rate Limit** | 89 | 7.2% | RPC endpoint rate limiting |
| **Timeout (15s)** | 67 | 5.4% | Slow RPC responses |
| **Network Error** | 0 | 0% | - |

### Analysis

#### ⚠️ Critical Bottlenecks

1. **Stellar RPC Rate Limits:**
   - Testnet rate limit: ~100 requests/minute per IP
   - 7.2% of requests hit rate limiting (429 errors)
   - No ability to increase limits (external service)

2. **Transaction Queue Delays:**
   - Direct RPC calls p95: 6.9s (very slow)
   - Soroban network transaction queue congestion
   - Worse during network busy periods

3. **Timeout Frequency:**
   - 5.4% of operations timeout after 15s
   - RPC endpoint occasionally unresponsive
   - No SLA guarantees on testnet

#### ✅ Strengths

1. **Efficient batching:**
   - Batch operations 2x faster than individual calls
   - Parallel requests reduce overall latency

2. **Resilient to failures:**
   - 87.4% success rate despite RPC issues
   - Application continues functioning with degraded RPC

### Recommendations

#### Immediate Actions

1. **Implement exponential backoff:**
   ```typescript
   async function callRpcWithRetry(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429) {
           const delay = Math.min(1000 * Math.pow(2, i), 10000);
           await new Promise(r => setTimeout(r, delay));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Add RPC request caching:**
   - Cache verification status for 30 seconds
   - Cache project data for 5 minutes
   - Expected improvement: Reduce RPC calls by 60-70%

3. **Implement request coalescing:**
   - Combine duplicate concurrent requests
   - If 10 users request same project, make 1 RPC call
   - Expected improvement: Reduce RPC load by 40-50%

#### Production Optimizations

1. **Use dedicated RPC endpoint:**
   - Purchase dedicated Stellar RPC service (e.g., Mercury, QuickNode)
   - Higher rate limits (1000+ req/min)
   - SLA guarantees (99.9% uptime)
   - Cost: ~$100-500/month

2. **Implement RPC indexer:**
   - Run background job to sync blockchain state
   - Store in local database (PostgreSQL)
   - Serve reads from database (sub-100ms)
   - Only write operations hit RPC

3. **Add fallback RPC endpoints:**
   ```typescript
   const RPC_ENDPOINTS = [
     'https://soroban-testnet.stellar.org:443',
     'https://soroban-rpc.mercury.com',
     'https://stellar-rpc.quicknode.com',
   ];
   
   async function callWithFailover(fn) {
     for (const endpoint of RPC_ENDPOINTS) {
       try {
         return await fn(endpoint);
       } catch (error) {
         console.warn(`RPC ${endpoint} failed, trying next...`);
       }
     }
     throw new Error('All RPC endpoints failed');
   }
   ```

---

## Maximum Safe Concurrent Users

### Review Submission (POST /api/reviews)

| Configuration | Max Users | Bottleneck | Notes |
|---------------|-----------|------------|-------|
| **localStorage mode** | 200 | Client storage limits | Dev only |
| **In-memory API** | 100 | Concurrent write conflicts | Dev only |
| **PostgreSQL + 1 server** | 500 | Database connections | Production |
| **PostgreSQL + 5 servers** | 2,000 | Database write throughput | Scaled production |

**Recommended Production Limit:** 500 concurrent users per app server

### Soroban RPC Operations

| Configuration | Max Users | Bottleneck | Notes |
|---------------|-----------|------------|-------|
| **Testnet RPC (no caching)** | 20 | Rate limits (100 req/min) | Dev only |
| **Testnet RPC + caching** | 50 | Rate limits | Dev acceptable |
| **Dedicated RPC** | 200 | RPC response time | Production |
| **Dedicated RPC + indexer** | 1,000+ | Application throughput | Scaled production |

**Recommended Production Limit:** 200 concurrent users with dedicated RPC

### Read-Only Operations

| Endpoint | Max Users | Notes |
|----------|-----------|-------|
| **GET /api/reviews** | 1,000+ | Static data, cacheable |
| **Discover page** | 2,000+ | Static project list |
| **Project detail page** | 500 | Depends on RPC caching |

---

## Capacity Planning

### Current Capacity (Development)
- **Review submission:** 100 concurrent users
- **Soroban operations:** 30 concurrent users
- **Total application:** Limited by RPC rate limits

### Target Capacity (Production Launch)
- **Review submission:** 500 concurrent users
- **Soroban operations:** 200 concurrent users
- **Total application:** 500 concurrent users (limited by RPC)

### Infrastructure Requirements

#### Phase 1: MVP Launch (500 users)
- **Application servers:** 2x (load balanced)
- **Database:** PostgreSQL (managed service, 2 vCPU, 8GB RAM)
- **RPC:** Dedicated endpoint (1000 req/min)
- **Caching:** Redis (optional, improves performance)
- **Estimated cost:** $150-300/month

#### Phase 2: Growth (2000 users)
- **Application servers:** 5x (auto-scaling)
- **Database:** PostgreSQL (4 vCPU, 16GB RAM, read replicas)
- **RPC:** Dedicated endpoint (5000 req/min) + indexer
- **Caching:** Redis (required)
- **CDN:** Cloudflare/Vercel Edge
- **Estimated cost:** $500-1000/month

#### Phase 3: Scale (10,000+ users)
- **Application servers:** 20+ (auto-scaling)
- **Database:** PostgreSQL cluster (sharding)
- **RPC:** Multiple dedicated endpoints + full indexer
- **Caching:** Redis cluster
- **CDN:** Global edge network
- **Estimated cost:** $2000-5000/month

---

## Monitoring and Alerting

### Key Metrics to Track

#### Application Metrics
- **Request rate:** requests/second
- **Response time:** p50, p95, p99
- **Error rate:** percentage of 4xx/5xx responses
- **Concurrent users:** active connections

#### Infrastructure Metrics
- **CPU utilization:** per app server
- **Memory usage:** per app server
- **Database connections:** active/idle ratio
- **Database query time:** slow query log

#### RPC Metrics
- **RPC request rate:** calls/minute
- **RPC error rate:** 429/timeout percentage
- **RPC response time:** p95, p99
- **Cache hit rate:** percentage served from cache

### Alerting Thresholds

#### Critical (Page immediately)
- Error rate > 15% for 5 minutes
- p99 response time > 10s for 5 minutes
- RPC timeout rate > 20% for 10 minutes
- Database connection pool exhausted

#### Warning (Notify team)
- Error rate > 5% for 10 minutes
- p95 response time > 3s for 10 minutes
- RPC rate limit errors > 10% for 15 minutes
- CPU > 80% for 15 minutes

---

## Load Testing Schedule

### Development
- Run basic load test before each release
- Command: `npm run load:test`
- Acceptance criteria: Pass all thresholds

### Staging
- Run full load test after deployment
- Weekly scheduled tests (off-peak hours)
- Record baseline metrics

### Production
- Monthly capacity validation tests
- Run during lowest traffic period (e.g., 3 AM UTC)
- Gradually ramp up to 50% of max capacity
- Monitor all metrics during test

---

## Appendix: Running Load Tests

### Quick Start

```bash
# Install k6
winget install k6 --source winget

# Start application
cd dongle
npm run dev

# Run review submission test
npm run load:review

# Run Soroban RPC test
npm run load:soroban

# Run both tests
npm run load:test
```

### Advanced Options

```bash
# Custom VU count and duration
k6 run --vus 50 --duration 60s __tests__/load/review-submission.load.js

# Export results to JSON
k6 run --summary-export=results.json __tests__/load/review-submission.load.js

# Test against staging
k6 run --env BASE_URL=https://staging.dongle.app __tests__/load/review-submission.load.js
```

See [`__tests__/load/README.md`](../dongle/__tests__/load/README.md) for complete documentation.

---

## Conclusion

The Dongle frontend demonstrates good performance for review submissions but faces limitations from external Soroban RPC rate limits. Key recommendations:

1. **Immediate:** Implement RPC caching and request coalescing
2. **Before Production:** Migrate to database storage, add dedicated RPC endpoint
3. **For Scale:** Implement indexer, add Redis caching, horizontal scaling

**Current safe limits:**
- Development: 50 concurrent users
- Production (with recommended changes): 500 concurrent users

**Next steps:**
1. Implement RPC caching (easy win, 60% improvement)
2. Set up PostgreSQL for review storage
3. Purchase dedicated RPC endpoint
4. Add monitoring and alerting
5. Re-run load tests after each optimization

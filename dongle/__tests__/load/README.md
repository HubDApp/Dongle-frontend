# Load Testing Guide

This directory contains k6 load tests for critical transaction paths in the Dongle frontend application.

## Prerequisites

### Installing k6

k6 is a standalone load testing tool. Install it based on your operating system:

**Windows (using Chocolatey):**
```powershell
choco install k6
```

**Windows (using winget):**
```powershell
winget install k6 --source winget
```

**macOS (using Homebrew):**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Alternative: Download binary**
- Download from: https://k6.io/docs/get-started/installation/
- Place the binary in your PATH

Verify installation:
```bash
k6 version
```

## Available Tests

### 1. Review Submission Load Test

Tests the POST `/api/reviews` endpoint under load.

**File:** `review-submission.load.js`

**Target:** 100 concurrent virtual users

**Metrics tracked:**
- HTTP request duration (p95, p99)
- Error rates
- Review submission success rate
- Validation errors

**Run commands:**

Basic run (30 seconds, 100 VUs):
```bash
cd dongle
k6 run --vus 100 --duration 30s __tests__/load/review-submission.load.js
```

Extended run with results export:
```bash
k6 run --vus 100 --duration 60s --summary-export=load-test-results.json __tests__/load/review-submission.load.js
```

Against production/staging:
```bash
k6 run --env BASE_URL=https://dongle-staging.vercel.app --vus 100 --duration 30s __tests__/load/review-submission.load.js
```

### 2. Soroban RPC Batch Operations Test

Tests batch project fetching and Soroban RPC calls under load.

**File:** `soroban-rpc-batch.load.js`

**Target:** 50 concurrent virtual users (RPC endpoints have stricter rate limits)

**Metrics tracked:**
- RPC call duration
- Project fetch duration
- Verification check duration
- Rate limit errors
- Timeout errors

**Run commands:**

Basic run:
```bash
cd dongle
k6 run --vus 50 --duration 30s __tests__/load/soroban-rpc-batch.load.js
```

With custom RPC endpoint:
```bash
k6 run --env BASE_URL=http://localhost:3000 --env RPC_URL=https://soroban-testnet.stellar.org:443 --vus 50 --duration 60s __tests__/load/soroban-rpc-batch.load.js
```

Extended stress test:
```bash
k6 run --vus 50 --duration 5m --summary-export=rpc-load-results.json __tests__/load/soroban-rpc-batch.load.js
```

## Running Tests

### Before Running Load Tests

1. **Start the application:**
   ```bash
   cd dongle
   npm run dev
   ```
   Wait for the server to start on http://localhost:3000

2. **Verify endpoints are accessible:**
   ```bash
   curl http://localhost:3000/api/reviews
   ```

### Running Tests Against Local Development

```bash
# Terminal 1: Start the app
cd dongle
npm run dev

# Terminal 2: Run load tests
cd dongle
k6 run __tests__/load/review-submission.load.js
```

### Running Tests Against Deployed Environments

**Staging:**
```bash
k6 run --env BASE_URL=https://dongle-staging.vercel.app __tests__/load/review-submission.load.js
```

**Production (use with caution):**
```bash
k6 run --env BASE_URL=https://dongle.app --vus 20 --duration 10s __tests__/load/review-submission.load.js
```

⚠️ **Warning:** Running load tests against production can impact real users. Always:
- Get approval before load testing production
- Use lower VU counts
- Run during low-traffic periods
- Monitor application metrics during tests

## Understanding Results

### Key Metrics

**http_req_duration:** Time for complete HTTP request/response
- Target: p95 < 2000ms, p99 < 5000ms

**http_req_failed:** Percentage of failed requests
- Target: < 5%

**Custom metrics:**
- `review_submission_duration`: End-to-end review submission time
- `rpc_call_duration`: Direct Soroban RPC call latency
- `rate_limit_errors`: Count of 429 (Too Many Requests) responses
- `timeout_errors`: Count of timeout failures

### Interpreting Results

**Example output:**
```
     ✓ status is 201 (created) or 409 (duplicate)
     ✓ response has success field
     ✓ response time < 2000ms
     ✓ response time < 5000ms

     checks.........................: 100.00% ✓ 4000      ✗ 0
     data_received..................: 1.2 MB  40 kB/s
     data_sent......................: 450 kB  15 kB/s
     http_req_duration..............: avg=850ms min=120ms med=780ms max=3.2s p(95)=1.8s p(99)=2.5s
     http_req_failed................: 0.00%   ✓ 0        ✗ 1000
     iterations.....................: 1000    33.33/s
     review_submission_duration.....: avg=850ms min=120ms med=780ms max=3.2s p(95)=1.8s p(99)=2.5s
     successful_submissions.........: 980     32.67/s
     validation_errors..............: 10      0.33/s
     vus............................: 100     min=0      max=100
```

**What to look for:**
- ✓ All checks passing (100%)
- http_req_duration p95 < 2000ms (good performance)
- http_req_failed < 5% (low error rate)
- No rate_limit_errors or timeouts

**Red flags:**
- ✗ Failed checks (errors in responses)
- http_req_failed > 10% (high error rate)
- p95 > 3000ms (slow responses under load)
- High rate_limit_errors (need to implement rate limiting strategy)

## Customizing Tests

### Adjusting Load Patterns

Edit the `options.stages` in test files:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up
    { duration: '1m', target: 100 },   // Peak load
    { duration: '2m', target: 100 },   // Sustain
    { duration: '30s', target: 0 },    // Ramp down
  ],
};
```

### Common Load Patterns

**Spike test** (sudden traffic increase):
```javascript
stages: [
  { duration: '10s', target: 0 },
  { duration: '5s', target: 200 },  // Sudden spike
  { duration: '1m', target: 200 },
  { duration: '10s', target: 0 },
]
```

**Stress test** (find breaking point):
```javascript
stages: [
  { duration: '1m', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 200 },
  { duration: '1m', target: 300 },  // Increase until failure
]
```

**Soak test** (long-duration stability):
```javascript
stages: [
  { duration: '2m', target: 50 },
  { duration: '30m', target: 50 },  // Long sustain
  { duration: '2m', target: 0 },
]
```

## Integration with CI/CD

### GitHub Actions Example

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run load tests
        run: |
          k6 run --env BASE_URL=${{ secrets.STAGING_URL }} \
                 --vus 50 \
                 --duration 30s \
                 --summary-export=results.json \
                 dongle/__tests__/load/review-submission.load.js
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: results.json
```

## Troubleshooting

### Port Already in Use

If you see connection errors, ensure the app is running:
```bash
curl http://localhost:3000/api/reviews
```

### Rate Limiting Issues

If you see many 429 errors:
- Reduce VU count
- Increase think time (`sleep` duration)
- Implement exponential backoff

### Memory Issues

Large tests may consume significant memory:
- Reduce VU count
- Shorten test duration
- Run tests on a machine with more RAM

## Best Practices

1. **Start small:** Begin with 10-20 VUs and gradually increase
2. **Monitor during tests:** Watch application logs and metrics
3. **Run regularly:** Schedule weekly load tests to catch regressions
4. **Test realistic scenarios:** Mix read/write operations, vary think times
5. **Document baselines:** Record typical performance metrics for comparison
6. **Test edge cases:** Invalid data, missing fields, duplicate submissions

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/introduction/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)

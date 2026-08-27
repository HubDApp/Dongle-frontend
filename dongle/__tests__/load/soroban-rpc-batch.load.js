/**
 * k6 Load Test: Soroban RPC Batch Operations
 * 
 * Tests batch project fetching and verification status checks against Soroban RPC
 * 
 * Run with:
 *   k6 run --vus 50 --duration 30s __tests__/load/soroban-rpc-batch.load.js
 * 
 * Environment variables:
 *   BASE_URL: Frontend URL (default: http://localhost:3000)
 *   RPC_URL: Soroban RPC endpoint (default: https://soroban-testnet.stellar.org:443)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const rpcCallDuration = new Trend('rpc_call_duration');
const projectFetchDuration = new Trend('project_fetch_duration');
const verificationCheckDuration = new Trend('verification_check_duration');
const rateLimitErrors = new Counter('rate_limit_errors');
const timeoutErrors = new Counter('timeout_errors');
const successfulCalls = new Counter('successful_calls');

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 10 },   // Warm up to 10 users
    { duration: '40s', target: 50 },   // Ramp up to 50 concurrent users
    { duration: '2m', target: 50 },    // Maintain 50 users
    { duration: '20s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000', 'p(99)<8000'], // RPC calls can be slower
    http_req_failed: ['rate<0.10'],                   // Allow 10% error rate (network/RPC issues)
    errors: ['rate<0.10'],
    rpc_call_duration: ['p(95)<3000'],
    rate_limit_errors: ['count<100'],                 // Monitor rate limiting
  },
};

// Test project IDs for batch operations
const TEST_PROJECT_IDS = [
  'soroban-swap',
  'stellar-guardians',
  'lumens-tracker',
  'stellar-vault',
  'nebula-nft',
  'aqua-network',
  'stellar-bridge',
  'orbit-marketplace',
  'photon-wallet',
  'comet-protocol',
];

/**
 * Simulates batch project fetch by making parallel RPC calls
 */
function batchFetchProjects(baseUrl, projectIds) {
  const startTime = new Date();
  const requests = projectIds.map((projectId) => ({
    method: 'GET',
    url: `${baseUrl}/api/projects/${projectId}`,
    params: {
      tags: { name: 'BatchProjectFetch' },
    },
  }));

  // k6 batch function executes requests in parallel
  const responses = http.batch(requests);
  const duration = new Date() - startTime;

  projectFetchDuration.add(duration);

  let successCount = 0;
  let errorCount = 0;

  responses.forEach((response, index) => {
    const success = check(response, {
      'project fetch status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'project fetch response time < 3000ms': (r) => r.timings.duration < 3000,
    });

    if (success) {
      successCount++;
    } else {
      errorCount++;
      if (response.status === 429) {
        rateLimitErrors.add(1);
      } else if (response.status === 0 || response.error_code === 1050) {
        timeoutErrors.add(1);
      }
    }
  });

  return { successCount, errorCount, duration };
}

/**
 * Tests verification status checks for multiple projects
 */
function batchCheckVerificationStatus(baseUrl, projectIds) {
  const startTime = new Date();
  const requests = projectIds.map((projectId) => ({
    method: 'GET',
    url: `${baseUrl}/api/verification/status/${projectId}`,
    params: {
      tags: { name: 'BatchVerificationCheck' },
    },
  }));

  const responses = http.batch(requests);
  const duration = new Date() - startTime;

  verificationCheckDuration.add(duration);

  let successCount = 0;
  responses.forEach((response) => {
    if (check(response, {
      'verification status is 200': (r) => r.status === 200,
      'response has status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status !== undefined;
        } catch {
          return false;
        }
      },
    })) {
      successCount++;
    }
  });

  return { successCount, duration };
}

/**
 * Direct Soroban RPC call simulation
 */
function testSorobanRpcDirectly(rpcUrl) {
  const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  
  const payload = JSON.stringify({
    jsonrpc: '2.0',
    id: Math.floor(Math.random() * 1000000),
    method: 'getLedgerEntries',
    params: {
      keys: [`AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`], // Mock contract key
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'DirectRPCCall' },
    timeout: '15s',
  };

  const startTime = new Date();
  const response = http.post(rpcUrl, payload, params);
  const duration = new Date() - startTime;

  rpcCallDuration.add(duration);

  check(response, {
    'RPC call status is 200': (r) => r.status === 200,
    'RPC response is valid JSON-RPC': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.jsonrpc === '2.0';
      } catch {
        return false;
      }
    },
    'RPC call response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  if (response.status === 429) {
    rateLimitErrors.add(1);
  } else if (response.status === 0 || response.error_code === 1050) {
    timeoutErrors.add(1);
  } else if (response.status === 200) {
    successfulCalls.add(1);
  }

  errorRate.add(response.status !== 200);
}

// Main test function
export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const rpcUrl = __ENV.RPC_URL || 'https://soroban-testnet.stellar.org:443';

  // Randomly select test scenario
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Batch fetch projects (3-5 projects)
    const batchSize = Math.floor(Math.random() * 3) + 3;
    const projectIds = TEST_PROJECT_IDS.sort(() => 0.5 - Math.random()).slice(0, batchSize);
    const result = batchFetchProjects(baseUrl, projectIds);
    
    if (result.successCount > 0) {
      successfulCalls.add(result.successCount);
    }
    if (result.errorCount > 0) {
      errorRate.add(true);
    }
  } else if (scenario < 0.7) {
    // 30% - Batch verification status checks (2-4 projects)
    const batchSize = Math.floor(Math.random() * 3) + 2;
    const projectIds = TEST_PROJECT_IDS.sort(() => 0.5 - Math.random()).slice(0, batchSize);
    const result = batchCheckVerificationStatus(baseUrl, projectIds);
    
    if (result.successCount > 0) {
      successfulCalls.add(result.successCount);
    }
  } else {
    // 30% - Direct Soroban RPC call
    testSorobanRpcDirectly(rpcUrl);
  }

  // Think time: simulate user navigation/processing
  sleep(Math.random() * 3 + 2); // 2-5 seconds
}

// Setup
export function setup() {
  console.log('Starting Soroban RPC batch operations load test');
  console.log(`Base URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`RPC URL: ${__ENV.RPC_URL || 'https://soroban-testnet.stellar.org:443'}`);
  console.log('Testing scenarios: batch project fetch, verification checks, direct RPC calls');
  return { startTime: new Date().toISOString() };
}

// Teardown
export function teardown(data) {
  console.log(`Test completed. Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
  console.log('Check metrics for rate limiting and timeout patterns');
}

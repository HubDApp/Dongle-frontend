/**
 * k6 Load Test: Review Submission Endpoint
 * 
 * Tests POST /api/reviews with 100 concurrent virtual users
 * 
 * Run with:
 *   k6 run --vus 100 --duration 30s __tests__/load/review-submission.load.js
 * 
 * Or with custom thresholds:
 *   k6 run --vus 100 --duration 60s --summary-export=results.json __tests__/load/review-submission.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const reviewSubmissionDuration = new Trend('review_submission_duration');
const validationErrors = new Counter('validation_errors');
const successfulSubmissions = new Counter('successful_submissions');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 users
    { duration: '1m', target: 100 },   // Ramp up to 100 concurrent users
    { duration: '2m', target: 100 },   // Stay at 100 users for 2 minutes
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% requests under 2s, 99% under 5s
    http_req_failed: ['rate<0.05'],                   // Error rate below 5%
    errors: ['rate<0.05'],                            // Custom error rate below 5%
    review_submission_duration: ['p(95)<2000'],       // 95% review submissions under 2s
  },
};

// Test data generators
function generateWalletAddress() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let address = 'G';
  for (let i = 0; i < 55; i++) {
    address += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return address;
}

function generateReview() {
  const projectIds = [
    'soroban-swap',
    'stellar-guardians',
    'lumens-tracker',
    'stellar-vault',
    'nebula-nft',
  ];
  
  const comments = [
    'Excellent project with great documentation and active community support. The team is responsive and the product is solid.',
    'Good implementation but could use better error messages. Overall satisfied with the functionality and performance.',
    'Amazing DeFi protocol! Low fees, fast transactions, and intuitive UI. Highly recommend for anyone in the Stellar ecosystem.',
    'Decent project but needs improvement in documentation. The core features work well but onboarding could be smoother.',
    'Outstanding work on security and testing. The audit report is comprehensive and the team addressed all concerns promptly.',
  ];

  return {
    projectId: projectIds[Math.floor(Math.random() * projectIds.length)],
    projectName: 'Test Project',
    userAddress: generateWalletAddress(),
    rating: Math.floor(Math.random() * 5) + 1, // 1-5
    comment: comments[Math.floor(Math.random() * comments.length)],
  };
}

// Main test function
export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const review = generateReview();

  const payload = JSON.stringify(review);
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'ReviewSubmission' },
  };

  const response = http.post(`${baseUrl}/api/reviews`, payload, params);

  // Record metrics
  reviewSubmissionDuration.add(response.timings.duration);
  errorRate.add(response.status !== 201 && response.status !== 409);

  // Check response
  const checkResult = check(response, {
    'status is 201 (created) or 409 (duplicate)': (r) => r.status === 201 || r.status === 409,
    'response has success field': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.hasOwnProperty('success');
      } catch {
        return false;
      }
    },
    'response time < 2000ms': (r) => r.timings.duration < 2000,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  if (response.status === 201) {
    successfulSubmissions.add(1);
  } else if (response.status === 400) {
    validationErrors.add(1);
  } else if (response.status !== 409) {
    console.error(`Unexpected status: ${response.status}, body: ${response.body}`);
  }

  // Think time: simulate user reading/typing
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

// Setup function runs once per VU at the start
export function setup() {
  console.log('Starting load test for review submission endpoint');
  console.log(`Base URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log('Target: 100 concurrent users');
  return { startTime: new Date().toISOString() };
}

// Teardown function runs once at the end
export function teardown(data) {
  console.log(`Test completed. Started at: ${data.startTime}`);
  console.log(`Ended at: ${new Date().toISOString()}`);
}

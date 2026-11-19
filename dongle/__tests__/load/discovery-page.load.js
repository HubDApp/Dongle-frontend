/**
 * k6 Load Test: Discovery Page
 *
 * 100 VUs fetching /discover with various filters.
 *
 * Run with:
 *   k6 run __tests__/load/discovery-page.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const QUERIES = [
  '',
  '?q=soroban',
  '?status=VERIFIED',
  '?category=defi',
  '?sort=newest',
  '?q=wallet&sort=rating',
];

export const options = {
  vus: 100,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const res = http.get(`${BASE_URL}/discover${query}`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

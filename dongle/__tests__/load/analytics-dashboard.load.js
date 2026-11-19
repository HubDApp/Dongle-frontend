/**
 * k6 Load Test: Analytics Dashboard API
 *
 * 50 VUs fetching /api/analytics with different ranges.
 *
 * Run with:
 *   k6 run __tests__/load/analytics-dashboard.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

const RANGES = ['7d', '30d', '90d', 'all'];
const STATUSES = ['all', 'VERIFIED', 'PENDING'];

export const options = {
  vus: 50,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const range = RANGES[Math.floor(Math.random() * RANGES.length)];
  const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
  const res = http.get(`${BASE_URL}/api/analytics?range=${range}&status=${status}`);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

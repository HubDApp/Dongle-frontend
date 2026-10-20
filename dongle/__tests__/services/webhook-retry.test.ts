/**
 * Tests for webhook retry service
 */

import { describe, it, expect } from 'vitest';
import {
  calculateRetryDelay,
  DEFAULT_RETRY_CONFIG,
} from '@/services/webhook/webhook-retry.service';

describe('Webhook Retry Service', () => {
  describe('calculateRetryDelay', () => {
    it('should implement exponential backoff', () => {
      const delays = [
        calculateRetryDelay(0, DEFAULT_RETRY_CONFIG),
        calculateRetryDelay(1, DEFAULT_RETRY_CONFIG),
        calculateRetryDelay(2, DEFAULT_RETRY_CONFIG),
        calculateRetryDelay(3, DEFAULT_RETRY_CONFIG),
      ];

      // Each delay should be roughly double the previous (with jitter)
      expect(delays[1]).toBeGreaterThanOrEqual(delays[0] * 0.7); // Account for negative jitter
      expect(delays[2]).toBeGreaterThanOrEqual(delays[1] * 0.7);
      expect(delays[3]).toBeGreaterThanOrEqual(delays[2] * 0.7);
    });

    it('should respect max delay', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, maxDelay: 10000 };
      const delay = calculateRetryDelay(100, config); // Very high attempt

      expect(delay).toBeLessThanOrEqual(config.maxDelay * 1.5); // Allow for jitter
    });

    it('should add jitter', () => {
      const delays = Array.from({ length: 10 }, () =>
        calculateRetryDelay(2, DEFAULT_RETRY_CONFIG)
      );

      // With jitter, not all delays should be identical
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('should never return negative delay', () => {
      const delay = calculateRetryDelay(0, DEFAULT_RETRY_CONFIG);
      expect(delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Retry Configuration', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(5);
      expect(DEFAULT_RETRY_CONFIG.baseDelay).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelay).toBe(300000);
      expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.3);
    });
  });
});

/**
 * Tests for webhook signature generation and verification
 */

import { describe, it, expect } from 'vitest';
import {
  generateSignature,
  verifySignature,
  createSignatureHeaders,
} from '@/lib/webhook-signature';

describe('Webhook Signature', () => {
  const secret = 'test-webhook-secret';
  const payload = JSON.stringify({ event: 'test', data: { hello: 'world' } });

  describe('generateSignature', () => {
    it('should generate valid signature components', () => {
      const result = generateSignature(payload, secret);

      expect(result).toHaveProperty('signature');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('version');
      expect(result.version).toBe('v1');
      expect(result.signature).toMatch(/^v1=[a-f0-9]{64}$/);
    });

    it('should include timestamp in signature', () => {
      const timestamp = new Date().toISOString();
      const result = generateSignature(payload, secret, timestamp);

      expect(result.timestamp).toBe(timestamp);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ data: 'test1' });
      const payload2 = JSON.stringify({ data: 'test2' });

      const sig1 = generateSignature(payload1, secret);
      const sig2 = generateSignature(payload2, secret);

      expect(sig1.signature).not.toBe(sig2.signature);
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signatures', () => {
      const { signature, timestamp } = generateSignature(payload, secret);
      const result = verifySignature(payload, signature, timestamp, secret);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid signatures', () => {
      const { timestamp } = generateSignature(payload, secret);
      const invalidSignature = 'v1=0000000000000000000000000000000000000000000000000000000000000000';

      const result = verifySignature(payload, invalidSignature, timestamp, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject signatures with wrong secret', () => {
      const { signature, timestamp } = generateSignature(payload, secret);
      const wrongSecret = 'wrong-secret';

      const result = verifySignature(payload, signature, timestamp, wrongSecret);

      expect(result.valid).toBe(false);
    });

    it('should reject old timestamps (replay attack)', () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      const { signature } = generateSignature(payload, secret, oldTimestamp);

      const result = verifySignature(payload, signature, oldTimestamp, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('replay attack');
    });

    it('should allow skipping timestamp check', () => {
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { signature } = generateSignature(payload, secret, oldTimestamp);

      const result = verifySignature(payload, signature, oldTimestamp, secret, {
        skipTimestampCheck: true,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('createSignatureHeaders', () => {
    it('should create proper headers', () => {
      const data = { event: 'test', data: { hello: 'world' } };
      const headers = createSignatureHeaders(data, secret);

      expect(headers).toHaveProperty('X-Webhook-Signature');
      expect(headers).toHaveProperty('X-Webhook-Timestamp');
      expect(headers).toHaveProperty('Content-Type');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});

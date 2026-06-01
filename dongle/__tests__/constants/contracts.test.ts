import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseEnv, ContractIdSchema } from '../../constants/contracts';

describe('Contracts Environment Validation', () => {
  const validContract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('validates a correct Stellar contract ID format', () => {
    expect(() => ContractIdSchema.parse(validContract)).not.toThrow();
  });

  it('fails on invalid Stellar contract ID format', () => {
    expect(() => ContractIdSchema.parse('INVALID_CONTRACT_ID')).toThrow('Invalid Stellar Contract ID format');
    expect(() => ContractIdSchema.parse('C123')).toThrow('Invalid Stellar Contract ID format');
    expect(() => ContractIdSchema.parse('D' + validContract.slice(1))).toThrow('Invalid Stellar Contract ID format'); // Must start with C
  });

  it('uses development defaults when missing in dev/test mode', () => {
    const env = parseEnv({}, true);
    
    expect(env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT).toBe(validContract);
    expect(env.NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT).toBe(validContract);
    expect(env.NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT).toBe(validContract);
  });

  it('fails when missing required env variables in production mode', () => {
    expect(() => parseEnv({}, false)).toThrow('Invalid environment configuration. Please check your .env file.');
  });

  it('succeeds when provided valid env variables in production mode', () => {
    const validEnv = {
      NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT: validContract,
      NEXT_PUBLIC_REVIEW_REGISTRY_CONTRACT: validContract,
      NEXT_PUBLIC_VERIFICATION_REGISTRY_CONTRACT: validContract,
      NEXT_PUBLIC_SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org:443',
      NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    };

    const env = parseEnv(validEnv, false);
    expect(env.NEXT_PUBLIC_PROJECT_REGISTRY_CONTRACT).toBe(validContract);
    expect(env.NEXT_PUBLIC_SOROBAN_RPC_URL).toBe('https://soroban-testnet.stellar.org:443');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildApiKeyUsageUrl,
  extractApiKeyUsageSnapshot,
} from './apiKeyUsageProbe.js';

describe('apiKeyUsageProbe', () => {
  it('extracts the supported CC Switch usage response shapes', () => {
    expect(extractApiKeyUsageSnapshot({
      remaining: 12.5,
      unit: 'USD',
      is_active: true,
    })).toEqual({ remaining: 12.5, unit: 'USD', isValid: true });

    expect(extractApiKeyUsageSnapshot({
      quota: { remaining: '8.25', unit: 'CNY' },
      isValid: false,
    })).toEqual({ remaining: 8.25, unit: 'CNY', isValid: false });

    expect(extractApiKeyUsageSnapshot({ balance: 3 })).toEqual({
      remaining: 3,
      unit: 'USD',
      isValid: true,
    });
  });

  it('rejects missing or invalid remaining balances', () => {
    expect(() => extractApiKeyUsageSnapshot({ unit: 'USD' })).toThrow('remaining balance');
    expect(() => extractApiKeyUsageSnapshot({ remaining: -1 })).toThrow('remaining balance');
  });

  it('appends the configured path to the complete site base URL', () => {
    expect(buildApiKeyUsageUrl('https://relay.example.com/', '/v1/usage')).toBe(
      'https://relay.example.com/v1/usage',
    );
    expect(buildApiKeyUsageUrl('https://relay.example.com/api', 'usage')).toBe(
      'https://relay.example.com/api/usage',
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  parseAccountCreatePayload,
  parseAccountUpdatePayload,
} from './accountsRoutePayloads.js';

describe('accountsRoutePayloads API Key usage configuration', () => {
  it('accepts and normalizes usage probe settings for account creation', () => {
    const result = parseAccountCreatePayload({
      siteId: 1,
      credentialMode: 'apikey',
      apiKeyUsage: {
        enabled: true,
        path: '  /v1/usage  ',
        minRemaining: 1.5,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.apiKeyUsage).toEqual({
        enabled: true,
        path: '/v1/usage',
        minRemaining: 1.5,
      });
    }
  });

  it('accepts usage probe settings on account updates', () => {
    const result = parseAccountUpdatePayload({
      apiKeyUsage: { enabled: false, path: '/v1/usage', minRemaining: 0 },
    });

    expect(result.success).toBe(true);
  });

  it('rejects absolute paths and negative thresholds', () => {
    expect(parseAccountCreatePayload({
      siteId: 1,
      apiKeyUsage: { enabled: true, path: 'https://evil.example/usage', minRemaining: 1 },
    })).toEqual({ success: false, error: 'Invalid apiKeyUsage configuration.' });

    expect(parseAccountUpdatePayload({
      apiKeyUsage: { enabled: true, path: '/v1/usage', minRemaining: -1 },
    })).toEqual({ success: false, error: 'Invalid apiKeyUsage configuration.' });
  });
});

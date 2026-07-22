import type { RequestInit as UndiciRequestInit } from 'undici';

export type ApiKeyUsageSnapshot = {
  remaining: number;
  unit: string;
  isValid: boolean;
};

export class ApiKeyUsageProbeError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiKeyUsageProbeError';
  }
}

const API_KEY_USAGE_TIMEOUT_MS = 15_000;

function readNonNegativeNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 1_000_000) / 1_000_000;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return fallback;
}

export function buildApiKeyUsageUrl(baseUrl: string, path: string): string {
  const normalizedBaseUrl = (baseUrl || '').trim().replace(/\/+$/, '');
  const normalizedPath = (path || '').trim().replace(/^\/+/, '');
  if (!normalizedBaseUrl || !normalizedPath) {
    throw new ApiKeyUsageProbeError('invalid API Key usage probe URL');
  }
  return `${normalizedBaseUrl}/${normalizedPath}`;
}

export function extractApiKeyUsageSnapshot(payload: unknown): ApiKeyUsageSnapshot {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiKeyUsageProbeError('invalid API Key usage response');
  }

  const response = payload as Record<string, any>;
  const quota = response.quota && typeof response.quota === 'object' && !Array.isArray(response.quota)
    ? response.quota as Record<string, unknown>
    : {};
  const remaining = readNonNegativeNumber(
    response.remaining ?? quota.remaining ?? response.balance,
  );
  if (remaining === null) {
    throw new ApiKeyUsageProbeError('API Key usage response does not contain a valid remaining balance');
  }

  const rawUnit = response.unit ?? quota.unit;
  const unit = typeof rawUnit === 'string' && rawUnit.trim() ? rawUnit.trim() : 'USD';
  const isValid = readBoolean(response.is_active ?? response.isValid, true);

  return { remaining, unit, isValid };
}

export async function probeApiKeyUsage(input: {
  url: string;
  apiKey: string;
  requestInit?: UndiciRequestInit;
}): Promise<ApiKeyUsageSnapshot> {
  const { fetch, Headers } = await import('undici');
  const headers = new Headers(input.requestInit?.headers);
  headers.set('Authorization', `Bearer ${input.apiKey}`);
  headers.set('Accept', 'application/json');
  const response = await fetch(input.url, {
    ...(input.requestInit || {}),
    method: 'GET',
    headers,
    signal: input.requestInit?.signal ?? AbortSignal.timeout(API_KEY_USAGE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).slice(0, 500);
    throw new ApiKeyUsageProbeError(
      `API Key usage probe failed: HTTP ${response.status}${body ? `: ${body}` : ''}`,
      response.status,
    );
  }

  const payload = await response.json().catch(() => null);
  return extractApiKeyUsageSnapshot(payload);
}

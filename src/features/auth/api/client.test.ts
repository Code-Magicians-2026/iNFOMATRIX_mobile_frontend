import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, getApiErrorMessage, request } from './client';

const createResponse = (status: number, body: unknown, contentType: string) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });

describe('request', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('adds default headers for json requests', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse(200, { ok: true }, 'application/json'));

    await request('/api/test', {
      method: 'POST',
      body: JSON.stringify({ value: 1 }),
    });

    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;

    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('returns undefined on 204', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    const result = await request('/api/test');

    expect(result).toBeUndefined();
  });

  it('throws ApiError with problem detail message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(400, { detail: 'Invalid credentials' }, 'application/json'),
    );

    await expect(request('/api/test')).rejects.toEqual(
      expect.objectContaining({
        name: 'ApiError',
        status: 400,
        message: 'Invalid credentials',
      }),
    );
  });

  it('falls back to status message when error body cannot be parsed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(500, '{broken json', 'application/json'),
    );

    await expect(request('/api/test')).rejects.toEqual(
      expect.objectContaining({ message: 'Request failed with status 500' }),
    );
  });

  it('throws ApiError with text body for non-json errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(401, 'Unauthorized', 'text/plain'),
    );

    await expect(request('/api/test')).rejects.toEqual(
      expect.objectContaining({
        status: 401,
        message: 'Unauthorized',
      }),
    );
  });
});

describe('getApiErrorMessage', () => {
  it('returns ApiError message', () => {
    expect(getApiErrorMessage(new ApiError('Bad request', 400), 'Fallback')).toBe('Bad request');
  });

  it('maps network error to localized message', () => {
    expect(getApiErrorMessage(new Error('Network request failed'), 'Fallback')).toBe(
      'Не вдалося підключитися до сервера.',
    );
  });

  it('returns fallback for unknown errors', () => {
    expect(getApiErrorMessage({ reason: 'unknown' }, 'Fallback')).toBe('Fallback');
  });
});

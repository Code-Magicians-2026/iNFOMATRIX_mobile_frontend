import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sendPromptToAgent } from './agent';

const createResponse = (status: number, body: unknown, contentType: string) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });

describe('sendPromptToAgent', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns plain text response as is', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, 'AI text answer', 'text/plain'),
    );

    await expect(sendPromptToAgent('Hello')).resolves.toBe('AI text answer');
  });

  it('extracts text from object responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, { response: 'Structured answer' }, 'application/json'),
    );

    await expect(sendPromptToAgent('Hello')).resolves.toBe('Structured answer');
  });

  it('falls back when response has no known text fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, { foo: 'bar' }, 'application/json'),
    );

    await expect(sendPromptToAgent('Hello')).resolves.toBe('Сервер не повернув текст відповіді.');
  });

  it('passes authorization header when provided', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createResponse(200, { message: 'ok' }, 'application/json'));

    await sendPromptToAgent('Hello', 'Bearer token-1');

    const [, options] = fetchMock.mock.calls[0];
    const headers = options?.headers as Headers;

    expect(headers.get('Authorization')).toBe('Bearer token-1');
  });
});


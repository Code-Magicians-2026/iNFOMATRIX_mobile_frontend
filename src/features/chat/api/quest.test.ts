import { beforeEach, describe, expect, it, vi } from 'vitest';

import { generateSummaryVisionByPhotos } from './quest';

const createResponse = (
  status: number,
  body: unknown,
  contentType = 'application/json',
) =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': contentType },
  });

describe('generateSummaryVisionByPhotos', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /api/ai/summary-vision with multipart image1 + image2', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, { summary: 'Desk is cleaner in after photo.' }),
    );

    const summary = await generateSummaryVisionByPhotos(
      {
        uri: 'file:///photos/before.jpg',
        fileName: 'before.jpg',
        mimeType: 'image/jpeg',
      },
      {
        uri: 'file:///photos/after.jpg',
        fileName: 'after.jpg',
        mimeType: 'image/jpeg',
      },
      'token-summary',
    );

    expect(summary).toBe('Desk is cleaner in after photo.');

    const [calledUrl, options] = fetchMock.mock.calls[0] ?? [];
    expect(calledUrl).toBe(
      'https://infomatrix-api-cda8ftcucbg8dnfc.germanywestcentral-01.azurewebsites.net/api/ai/summary-vision',
    );

    const headers = options?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer token-summary');

    const body = options?.body as FormData;
    expect(body.get('image1')).not.toBeNull();
    expect(body.get('image2')).not.toBeNull();
  });

  it('extracts summary from nested payload fallback fields', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createResponse(200, {
        data: {
          message: 'Comparison complete. Visible improvement detected.',
        },
      }),
    );

    const summary = await generateSummaryVisionByPhotos(
      { uri: 'file:///photos/before-2.jpg' },
      { uri: 'file:///photos/after-2.jpg' },
      'token-summary',
    );

    expect(summary).toBe('Comparison complete. Visible improvement detected.');
  });
});


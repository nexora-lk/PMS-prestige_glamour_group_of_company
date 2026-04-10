/**
 * Dot Matrix endpoint tests
 * POST /api/dot-matrix/generate    → 202 starts job
 * GET  /api/dot-matrix/status/:id  → 200 job status / 404
 * GET  /api/dot-matrix/download/:id→ 200 file / 400 not ready / 410 cleaned / 404
 * POST /api/dot-matrix/print       → 200 / 400 / 500
 *
 * dotMatrixService is mocked to avoid real file generation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import fs from 'fs';

vi.mock('../services/dbStore');
vi.mock('../services/cache');
vi.mock('../plugins/prisma');

// Mock dotMatrixService to avoid real dot matrix file generation
vi.mock('../services/dotMatrixService', () => {
  const jobs = new Map<string, Record<string, unknown>>();

  return {
    startDotMatrixGeneration: vi.fn(async (payMonth: string, codeNos: string[] | undefined) => {
      const id = `dm-job-${Date.now()}`;
      const job = {
        id, status: 'processing', payMonth,
        total: codeNos?.length ?? 1, completed: 0, failed: 0,
        progress: 0, error: null, createdAt: new Date().toISOString(), filePath: null,
      };
      jobs.set(id, job);
      return { job, skipped: [] };
    }),

    getDotMatrixJob: vi.fn((jobId: string) => jobs.get(jobId) ?? null),

    printDotMatrixFile: vi.fn(async () => 'Dot matrix print job sent successfully'),

    __seedCompletedJob: (id: string, filePath: string) => {
      jobs.set(id, {
        id, status: 'completed', payMonth: '2026-04', total: 1, completed: 1,
        failed: 0, progress: 100, error: null, createdAt: new Date().toISOString(), filePath,
      });
    },

    __clearJobs: () => jobs.clear(),
  };
});

import { __resetStore } from '../services/dbStore';
import { __resetTokens } from '../plugins/prisma';
import { buildTestApp } from './helpers/testApp';
import { getAccessToken, authHeader } from './helpers/auth';

let app: FastifyInstance;
let token: string;

const TEST_PRN = '/tmp/test-payslips.prn';

beforeAll(async () => {
  app = await buildTestApp();
  token = await getAccessToken(app);
  if (!fs.existsSync(TEST_PRN)) fs.writeFileSync(TEST_PRN, '\x1b@ESC/P dot matrix content');
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  __resetStore();
  __resetTokens();
  const svc = await import('../services/dotMatrixService') as Record<string, unknown>;
  (svc.__clearJobs as () => void)();
});

// ── POST /api/dot-matrix/generate ─────────────────────────────

describe('POST /api/dot-matrix/generate', () => {
  it('returns 202 with jobId for valid payMonth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('jobId');
    expect(body).toHaveProperty('total');
  });

  it('accepts optional codeNos and useEscP fields', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04', codeNos: ['EMP001'], useEscP: false },
    });
    expect(res.statusCode).toBe(202);
  });

  it('returns 400 for missing payMonth', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for invalid payMonth format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: { payMonth: 'April-2026' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      payload: { payMonth: '2026-04' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/dot-matrix/status/:jobId ─────────────────────────

describe('GET /api/dot-matrix/status/:jobId', () => {
  it('returns job status for existing jobId', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    const { jobId } = JSON.parse(genRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/api/dot-matrix/status/${jobId}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('progress');
    expect(body).toHaveProperty('payMonth');
  });

  it('returns 404 for non-existent jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dot-matrix/status/no-such-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dot-matrix/status/some-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── GET /api/dot-matrix/download/:jobId ───────────────────────

describe('GET /api/dot-matrix/download/:jobId', () => {
  it('returns 400 when job is still processing', async () => {
    const genRes = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/generate',
      headers: authHeader(token),
      payload: { payMonth: '2026-04' },
    });
    const { jobId } = JSON.parse(genRes.body);

    const res = await app.inject({
      method: 'GET',
      url: `/api/dot-matrix/download/${jobId}`,
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/not ready/i);
  });

  it('returns 200 and streams file for completed job', async () => {
    const svc = await import('../services/dotMatrixService') as Record<string, unknown>;
    (svc.__seedCompletedJob as (id: string, path: string) => void)('dm-done', TEST_PRN);

    const res = await app.inject({
      method: 'GET',
      url: '/api/dot-matrix/download/dm-done',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('octet-stream');
  });

  it('returns 410 when file has been cleaned up', async () => {
    const svc = await import('../services/dotMatrixService') as Record<string, unknown>;
    (svc.__seedCompletedJob as (id: string, path: string) => void)('dm-cleaned', '/tmp/no-such.prn');

    const res = await app.inject({
      method: 'GET',
      url: '/api/dot-matrix/download/dm-cleaned',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(410);
  });

  it('returns 404 for non-existent jobId', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dot-matrix/download/no-job',
      headers: authHeader(token),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dot-matrix/download/some-id' });
    expect(res.statusCode).toBe(401);
  });
});

// ── POST /api/dot-matrix/print ────────────────────────────────

describe('POST /api/dot-matrix/print', () => {
  it('returns 200 with message for valid jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/print',
      headers: authHeader(token),
      payload: { jobId: 'dm-job-1' },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toHaveProperty('message');
  });

  it('accepts optional printerName and copies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/print',
      headers: authHeader(token),
      payload: { jobId: 'dm-job-1', printerName: 'Epson LX-350', copies: 2 },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns 400 for missing jobId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/print',
      headers: authHeader(token),
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for copies exceeding max (50)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/print',
      headers: authHeader(token),
      payload: { jobId: 'dm-job-1', copies: 99 },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dot-matrix/print',
      payload: { jobId: 'dm-job-1' },
    });
    expect(res.statusCode).toBe(401);
  });
});

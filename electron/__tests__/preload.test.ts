/**
 * Electron preload script tests
 *
 * Tests that the preload script correctly exposes the expected API surface
 * via contextBridge. We mock electron's contextBridge and ipcRenderer,
 * then import the preload to capture the exposed API.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// ── Mock electron APIs ────────────────────────────────────────

let exposedAPI: Record<string, unknown> = {};

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((key: string, api: Record<string, unknown>) => {
      exposedAPI = { ...api };
    }),
  },
  ipcRenderer: {
    invoke: vi.fn(async (channel: string, ...args: unknown[]) => {
      // Return predictable values for each channel
      switch (channel) {
        case 'get-app-version': return '1.2.3';
        case 'save-refresh-token': return true;
        case 'get-refresh-token': return 'mock-refresh-token';
        case 'delete-refresh-token': return true;
        case 'save-file': return { success: true, filePath: '/tmp/test.zip' };
        default: return null;
      }
    }),
  },
}));

// Import preload AFTER mocking electron so the mock is in place
beforeAll(async () => {
  // We reset and re-import to capture the exposeInMainWorld call
  await import('../preload');
});

// ── API surface ───────────────────────────────────────────────

describe('preload — API surface exposed via contextBridge', () => {
  it('exposes getAppVersion as a function', () => {
    expect(typeof exposedAPI.getAppVersion).toBe('function');
  });

  it('exposes isProduction as a function', () => {
    expect(typeof exposedAPI.isProduction).toBe('function');
  });

  it('exposes saveFile as a function', () => {
    expect(typeof exposedAPI.saveFile).toBe('function');
  });

  it('exposes saveRefreshToken as a function', () => {
    expect(typeof exposedAPI.saveRefreshToken).toBe('function');
  });

  it('exposes getRefreshToken as a function', () => {
    expect(typeof exposedAPI.getRefreshToken).toBe('function');
  });

  it('exposes deleteRefreshToken as a function', () => {
    expect(typeof exposedAPI.deleteRefreshToken).toBe('function');
  });

  it('does NOT expose any extra unexpected keys', () => {
    const allowedKeys = new Set([
      'getAppVersion', 'isProduction', 'saveFile',
      'saveRefreshToken', 'getRefreshToken', 'deleteRefreshToken',
    ]);
    for (const key of Object.keys(exposedAPI)) {
      expect(allowedKeys.has(key)).toBe(true);
    }
  });
});

// ── IPC channel mapping ───────────────────────────────────────

describe('preload — IPC channel routing', () => {
  it('getAppVersion invokes "get-app-version" channel', async () => {
    const result = await (exposedAPI.getAppVersion as () => Promise<string>)();
    expect(result).toBe('1.2.3');
  });

  it('saveRefreshToken invokes "save-refresh-token" channel', async () => {
    const result = await (exposedAPI.saveRefreshToken as (t: string) => Promise<boolean>)('my-token');
    expect(result).toBe(true);
  });

  it('getRefreshToken invokes "get-refresh-token" channel', async () => {
    const result = await (exposedAPI.getRefreshToken as () => Promise<string | null>)();
    expect(result).toBe('mock-refresh-token');
  });

  it('deleteRefreshToken invokes "delete-refresh-token" channel', async () => {
    const result = await (exposedAPI.deleteRefreshToken as () => Promise<boolean>)();
    expect(result).toBe(true);
  });

  it('saveFile invokes "save-file" channel with options', async () => {
    const opts = { data: [1, 2, 3], defaultName: 'payslips.zip' };
    const result = await (exposedAPI.saveFile as (o: typeof opts) => Promise<{ success: boolean }>)(opts);
    expect(result.success).toBe(true);
  });
});

// ── isProduction ──────────────────────────────────────────────

describe('preload — isProduction', () => {
  it('returns a boolean', () => {
    const result = (exposedAPI.isProduction as () => boolean)();
    expect(typeof result).toBe('boolean');
  });

  it('returns false in test environment (NODE_ENV=test)', () => {
    // In test environment, NODE_ENV is "test" not "production"
    const result = (exposedAPI.isProduction as () => boolean)();
    expect(result).toBe(false);
  });
});

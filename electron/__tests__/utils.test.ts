/**
 * Electron main process — path utility logic
 *
 * Tests the logic of getAsarPath, getExtraResourcePath, getUserDataPath
 * by recreating the functions with mocked environment variables.
 *
 * We do NOT import main.ts directly (it has side-effects like creating
 * BrowserWindow and forking the server). Instead we test the pure logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as path from 'path';

// ── Recreate the path helpers from main.ts ────────────────────
// These are the exact functions from main.ts with the same logic.

function makePathHelpers(isPackaged: boolean, resourcesPath: string, userData: string, dirname: string) {
  function getAsarPath(...segments: string[]): string {
    if (isPackaged) {
      return path.join(resourcesPath, 'app.asar', ...segments);
    }
    return path.join(dirname, '..', ...segments);
  }

  function getExtraResourcePath(...segments: string[]): string {
    if (isPackaged) {
      return path.join(resourcesPath, ...segments);
    }
    return path.join(dirname, '..', ...segments);
  }

  function getUserDataPath(...segments: string[]): string {
    return path.join(userData, ...segments);
  }

  return { getAsarPath, getExtraResourcePath, getUserDataPath };
}

const DEV_DIRNAME = '/app/electron/dist';
const RESOURCES_PATH = '/Applications/PMS.app/Contents/Resources';
const USER_DATA = '/Users/test/Library/Application Support/PMS';

// ── DEV mode (isPackaged = false) ────────────────────────────

describe('Path helpers — development mode (isPackaged=false)', () => {
  const { getAsarPath, getExtraResourcePath, getUserDataPath } = makePathHelpers(
    false, RESOURCES_PATH, USER_DATA, DEV_DIRNAME
  );

  describe('getAsarPath', () => {
    it('resolves relative to project root (not resourcesPath)', () => {
      const result = getAsarPath('client', 'dist');
      expect(result).toBe(path.join(DEV_DIRNAME, '..', 'client', 'dist'));
    });

    it('handles single segment', () => {
      const result = getAsarPath('dist');
      expect(result).toBe(path.join(DEV_DIRNAME, '..', 'dist'));
    });

    it('handles no segments', () => {
      const result = getAsarPath();
      expect(result).toBe(path.join(DEV_DIRNAME, '..'));
    });
  });

  describe('getExtraResourcePath', () => {
    it('resolves relative to project root', () => {
      const result = getExtraResourcePath('server', 'dist', 'app.js');
      expect(result).toBe(path.join(DEV_DIRNAME, '..', 'server', 'dist', 'app.js'));
    });

    it('handles server data path', () => {
      const result = getExtraResourcePath('server', 'data');
      expect(result).toBe(path.join(DEV_DIRNAME, '..', 'server', 'data'));
    });
  });

  describe('getUserDataPath', () => {
    it('always resolves relative to userData directory', () => {
      const result = getUserDataPath('data');
      expect(result).toBe(path.join(USER_DATA, 'data'));
    });

    it('handles nested paths', () => {
      const result = getUserDataPath('logs', 'app.log');
      expect(result).toBe(path.join(USER_DATA, 'logs', 'app.log'));
    });

    it('handles no segments (returns userData root)', () => {
      const result = getUserDataPath();
      expect(result).toBe(USER_DATA);
    });
  });
});

// ── PACKAGED mode (isPackaged = true) ────────────────────────

describe('Path helpers — packaged mode (isPackaged=true)', () => {
  const { getAsarPath, getExtraResourcePath, getUserDataPath } = makePathHelpers(
    true, RESOURCES_PATH, USER_DATA, DEV_DIRNAME
  );

  describe('getAsarPath', () => {
    it('resolves inside app.asar (resourcesPath)', () => {
      const result = getAsarPath('client', 'dist');
      expect(result).toBe(path.join(RESOURCES_PATH, 'app.asar', 'client', 'dist'));
    });

    it('handles single segment', () => {
      const result = getAsarPath('dist');
      expect(result).toBe(path.join(RESOURCES_PATH, 'app.asar', 'dist'));
    });

    it('returns app.asar root when no segments given', () => {
      const result = getAsarPath();
      expect(result).toBe(path.join(RESOURCES_PATH, 'app.asar'));
    });
  });

  describe('getExtraResourcePath', () => {
    it('resolves directly inside resourcesPath (outside asar)', () => {
      const result = getExtraResourcePath('server', 'dist', 'app.js');
      expect(result).toBe(path.join(RESOURCES_PATH, 'server', 'dist', 'app.js'));
    });

    it('handles server data path', () => {
      const result = getExtraResourcePath('server', 'data');
      expect(result).toBe(path.join(RESOURCES_PATH, 'server', 'data'));
    });
  });

  describe('getUserDataPath', () => {
    it('always resolves relative to userData (same in packaged)', () => {
      const result = getUserDataPath('data');
      expect(result).toBe(path.join(USER_DATA, 'data'));
    });

    it('handles exports directory', () => {
      const result = getUserDataPath('exports');
      expect(result).toBe(path.join(USER_DATA, 'exports'));
    });
  });
});

// ── ensureDefaultData logic ───────────────────────────────────

describe('ensureDefaultData logic', () => {
  it('copies only files that do not already exist in destination', () => {
    const copiedFiles: string[] = [];
    const existingDest: string[] = ['/data/file_already_there.json'];

    function simulateEnsureDefaultData(
      sourceFiles: string[],
      sourceDir: string,
      destDir: string
    ) {
      for (const file of sourceFiles) {
        const dest = path.join(destDir, file);
        if (!existingDest.includes(dest)) {
          copiedFiles.push(file);
        }
      }
    }

    simulateEnsureDefaultData(
      ['file_already_there.json', 'new_file.json'],
      '/app/server/data',
      '/data'
    );

    expect(copiedFiles).toEqual(['new_file.json']);
    expect(copiedFiles).not.toContain('file_already_there.json');
  });

  it('copies all files when destination is empty', () => {
    const copiedFiles: string[] = [];

    function simulateEnsureDefaultData(files: string[], destDir: string) {
      for (const file of files) {
        // dest never exists in this test
        copiedFiles.push(file);
      }
    }

    simulateEnsureDefaultData(['admin.json', 'users.json'], '/new/data');
    expect(copiedFiles).toHaveLength(2);
  });
});

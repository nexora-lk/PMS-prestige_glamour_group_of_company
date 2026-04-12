/**
 * Electron IPC handler logic tests
 *
 * Tests the logic of each IPC handler (save-refresh-token, get-refresh-token,
 * delete-refresh-token, save-file) in isolation — without importing main.ts.
 *
 * Each handler function is extracted here with the same logic as in main.ts
 * so it can be tested without Electron side effects.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ── Simulate safeStorage ──────────────────────────────────────

const mockSafeStorage = {
  isEncryptionAvailable: vi.fn(() => true),
  encryptString: vi.fn((s: string) => Buffer.from(`encrypted:${s}`)),
  decryptString: vi.fn((b: Buffer) => b.toString().replace('encrypted:', '')),
};

// ── Token file path ───────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pms-electron-test-'));
  // Reset mocks + restore implementations
  mockSafeStorage.isEncryptionAvailable.mockReset().mockImplementation(() => true);
  mockSafeStorage.encryptString.mockReset().mockImplementation((s: string) => Buffer.from(`encrypted:${s}`));
  mockSafeStorage.decryptString.mockReset().mockImplementation((b: Buffer) => b.toString().replace('encrypted:', ''));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function getTokenFilePath(): string {
  return path.join(tmpDir, 'refresh-token.enc');
}

// ── Handler: save-refresh-token ───────────────────────────────

function handleSaveRefreshToken(token: string): boolean {
  try {
    if (!mockSafeStorage.isEncryptionAvailable()) return false;
    const encrypted = mockSafeStorage.encryptString(token);
    fs.writeFileSync(getTokenFilePath(), encrypted);
    return true;
  } catch {
    return false;
  }
}

describe('IPC: save-refresh-token', () => {
  it('returns true and writes encrypted file', () => {
    const result = handleSaveRefreshToken('my-jwt-refresh-token');

    expect(result).toBe(true);
    expect(fs.existsSync(getTokenFilePath())).toBe(true);
    expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('my-jwt-refresh-token');
  });

  it('returns false when encryption is not available', () => {
    mockSafeStorage.isEncryptionAvailable.mockReturnValueOnce(false);

    const result = handleSaveRefreshToken('token');

    expect(result).toBe(false);
    expect(fs.existsSync(getTokenFilePath())).toBe(false);
  });

  it('returns false when fs.writeFileSync throws', () => {
    mockSafeStorage.encryptString.mockImplementationOnce(() => {
      throw new Error('Disk full');
    });

    const result = handleSaveRefreshToken('token');

    expect(result).toBe(false);
  });
});

// ── Handler: get-refresh-token ────────────────────────────────

function handleGetRefreshToken(): string | null {
  try {
    const filePath = getTokenFilePath();
    if (!fs.existsSync(filePath)) return null;
    if (!mockSafeStorage.isEncryptionAvailable()) return null;
    const encrypted = fs.readFileSync(filePath);
    return mockSafeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

describe('IPC: get-refresh-token', () => {
  it('returns null when file does not exist', () => {
    const result = handleGetRefreshToken();
    expect(result).toBeNull();
  });

  it('returns decrypted token when file exists', () => {
    // Save a token first
    handleSaveRefreshToken('my-stored-token');

    const result = handleGetRefreshToken();

    expect(result).toBe('my-stored-token');
    expect(mockSafeStorage.decryptString).toHaveBeenCalled();
  });

  it('returns null when encryption is not available (even if file exists)', () => {
    // Save succeeds (encryption available)
    handleSaveRefreshToken('stored');

    // Now encryption becomes unavailable for the GET call
    mockSafeStorage.isEncryptionAvailable.mockReturnValueOnce(false);

    const result = handleGetRefreshToken();
    expect(result).toBeNull();
  });

  it('returns null when decryption throws', () => {
    handleSaveRefreshToken('stored');
    mockSafeStorage.decryptString.mockImplementationOnce(() => {
      throw new Error('Decrypt failed');
    });

    const result = handleGetRefreshToken();
    expect(result).toBeNull();
  });
});

// ── Handler: delete-refresh-token ────────────────────────────

function handleDeleteRefreshToken(): boolean {
  try {
    const filePath = getTokenFilePath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('IPC: delete-refresh-token', () => {
  it('returns true and removes file when it exists', () => {
    handleSaveRefreshToken('stored-token');
    expect(fs.existsSync(getTokenFilePath())).toBe(true);

    const result = handleDeleteRefreshToken();

    expect(result).toBe(true);
    expect(fs.existsSync(getTokenFilePath())).toBe(false);
  });

  it('returns true when file does not exist (idempotent)', () => {
    const result = handleDeleteRefreshToken();

    expect(result).toBe(true);
  });
});

// ── Handler: save-file ────────────────────────────────────────

// Simulate save-file logic (without dialog — mocked)
async function handleSaveFile(
  options: { data: number[]; defaultName: string },
  showSaveDialogResult: { canceled: boolean; filePath?: string }
): Promise<{ success: boolean; filePath?: string; error?: string }> {
  if (showSaveDialogResult.canceled || !showSaveDialogResult.filePath) {
    return { success: false, error: 'Cancelled' };
  }

  try {
    fs.writeFileSync(showSaveDialogResult.filePath, Buffer.from(options.data));
    return { success: true, filePath: showSaveDialogResult.filePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

describe('IPC: save-file', () => {
  it('returns success=false when dialog is cancelled', async () => {
    const result = await handleSaveFile(
      { data: [1, 2, 3], defaultName: 'payslips.zip' },
      { canceled: true }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled');
  });

  it('returns success=false when no filePath returned', async () => {
    const result = await handleSaveFile(
      { data: [1, 2, 3], defaultName: 'payslips.zip' },
      { canceled: false, filePath: undefined }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Cancelled');
  });

  it('writes file and returns success=true with filePath', async () => {
    const targetPath = path.join(tmpDir, 'payslips.zip');
    const data = [80, 75, 3, 4]; // PK zip header bytes

    const result = await handleSaveFile(
      { data, defaultName: 'payslips.zip' },
      { canceled: false, filePath: targetPath }
    );

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(targetPath);
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(Array.from(fs.readFileSync(targetPath))).toEqual(data);
  });

  it('returns success=false when write fails', async () => {
    // Use a non-existent directory to force a write error
    const badPath = '/nonexistent/dir/file.zip';

    const result = await handleSaveFile(
      { data: [1, 2, 3], defaultName: 'file.zip' },
      { canceled: false, filePath: badPath }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ── Token round-trip ──────────────────────────────────────────

describe('Token storage round-trip', () => {
  it('save → get → delete cycle works correctly', () => {
    expect(handleGetRefreshToken()).toBeNull();

    handleSaveRefreshToken('round-trip-token');
    expect(handleGetRefreshToken()).toBe('round-trip-token');

    handleDeleteRefreshToken();
    expect(handleGetRefreshToken()).toBeNull();
  });

  it('overwrites existing token on re-save', () => {
    handleSaveRefreshToken('old-token');
    handleSaveRefreshToken('new-token');

    expect(handleGetRefreshToken()).toBe('new-token');
  });
});

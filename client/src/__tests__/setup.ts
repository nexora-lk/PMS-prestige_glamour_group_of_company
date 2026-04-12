import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

// ── Mock window.electronAPI ───────────────────────────────────
const mockElectronAPI = {
  getAppVersion: vi.fn(async () => '1.0.0'),
  isProduction: vi.fn(() => false),
  saveFile: vi.fn(async () => ({ success: true, filePath: '/tmp/file.zip' })),
  saveRefreshToken: vi.fn(async () => true),
  getRefreshToken: vi.fn(async () => null),
  deleteRefreshToken: vi.fn(async () => true),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
});

// Reset electronAPI mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
  mockElectronAPI.getRefreshToken.mockResolvedValue(null);
  mockElectronAPI.saveRefreshToken.mockResolvedValue(true);
  mockElectronAPI.deleteRefreshToken.mockResolvedValue(true);
  mockElectronAPI.getAppVersion.mockResolvedValue('1.0.0');
  mockElectronAPI.saveFile.mockResolvedValue({ success: true, filePath: '/tmp/file.zip' });
});

// ── Suppress noisy console.error in tests ────────────────────
const originalError = console.error;
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    // Suppress React act() warnings and network errors in tests
    if (
      msg.includes('Warning: An update to') ||
      msg.includes('act(') ||
      msg.includes('Network Error')
    ) return;
    originalError(...args);
  };
});

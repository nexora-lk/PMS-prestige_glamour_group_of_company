import path from 'path';
import fs from 'fs';

/**
 * Find a Chrome/Chromium executable on this machine.
 * Checks: bundled .chromium → global puppeteer cache → common install paths.
 */
export function findChromePath(): string | undefined {
  const isWin = process.platform === 'win32';
  const exeName = isWin ? 'chrome.exe' : 'chrome';

  function searchCache(cacheRoot: string): string | undefined {
    const chromeDir = path.join(cacheRoot, 'chrome');
    if (!fs.existsSync(chromeDir)) return undefined;
    try {
      const platforms = fs.readdirSync(chromeDir);
      for (const platform of platforms) {
        const versions = fs.readdirSync(path.join(chromeDir, platform));
        for (const ver of versions) {
          const winPath = path.join(chromeDir, platform, ver, 'chrome-win64', exeName);
          const linuxPath = path.join(chromeDir, platform, ver, 'chrome-linux64', exeName);
          if (fs.existsSync(winPath)) return winPath;
          if (fs.existsSync(linuxPath)) return linuxPath;
        }
      }
    } catch { /* ignore read errors */ }
    return undefined;
  }

  // 1. Bundled .chromium (packaged app)
  const localCache = path.join(__dirname, '..', '.chromium');
  const local = searchCache(localCache);
  if (local) return local;

  // 2. Global puppeteer cache (~/.cache/puppeteer)
  const homeDir = process.env.USERPROFILE || process.env.HOME || '';
  const globalCache = path.join(homeDir, '.cache', 'puppeteer');
  const globalResult = searchCache(globalCache);
  if (globalResult) return globalResult;

  // 3. Common Windows Chrome install paths
  if (isWin) {
    const commonPaths = [
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ];
    for (const p of commonPaths) {
      if (p && fs.existsSync(p)) return p;
    }
  }

  // 4. Common Linux paths
  if (!isWin) {
    const commonPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
    ];
    for (const p of commonPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  return undefined;
}

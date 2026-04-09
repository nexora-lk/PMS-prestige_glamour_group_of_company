import { app, BrowserWindow, ipcMain, dialog, safeStorage } from 'electron';
import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const IS_PACKAGED = app.isPackaged;
const SERVER_PORT = process.env.PORT || '4500';

// Set OS-level application name
app.name = 'PMS Application';
app.setName('PMS Application');

// ── Path helpers ──────────────────────────────────────────────
// In packaged app: resources are inside app.asar under process.resourcesPath
// In dev: files are relative to the project root

function getAsarPath(...segments: string[]): string {
  if (IS_PACKAGED) {
    return path.join(process.resourcesPath, 'app.asar', ...segments);
  }
  return path.join(__dirname, '..', ...segments);
}

function getExtraResourcePath(...segments: string[]): string {
  if (IS_PACKAGED) {
    return path.join(process.resourcesPath, ...segments);
  }
  return path.join(__dirname, '..', ...segments);
}

// Writable user data directory for JSON data, logs, temp, exports
function getUserDataPath(...segments: string[]): string {
  return path.join(app.getPath('userData'), ...segments);
}

// Copy default data files on first run
function ensureDefaultData(): void {
  const userDataDir = getUserDataPath('data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Source: bundled default data files (in extraResources)
  const sourceDir = getExtraResourcePath('server', 'data');
  if (!fs.existsSync(sourceDir)) return;

  const files = fs.readdirSync(sourceDir);
  for (const file of files) {
    const dest = path.join(userDataDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(path.join(sourceDir, file), dest);
    }
  }
}

// ── Window ────────────────────────────────────────────────────

function createWindow(): void {
  const iconPath = IS_PACKAGED
    ? path.join(process.resourcesPath, 'icon.png')
    : path.join(__dirname, '..', 'client', 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'PMS Application',
    autoHideMenuBar: true,
  });

  // Disable DevTools in production
  if (IS_PACKAGED) {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`http://localhost:${SERVER_PORT}`)) {
      event.preventDefault();
    }
  });

  // Block new window creation
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  waitForServer(() => {
    mainWindow?.loadURL(`http://localhost:${SERVER_PORT}`);
  });
}

function waitForServer(onReady: () => void): void {
  const socket = new net.Socket();
  socket.setTimeout(1000);

  socket.on('connect', () => {
    socket.destroy();
    onReady();
  });
  socket.on('error', () => {
    socket.destroy();
    setTimeout(() => waitForServer(onReady), 500);
  });
  socket.on('timeout', () => {
    socket.destroy();
    setTimeout(() => waitForServer(onReady), 500);
  });

  socket.connect(Number(SERVER_PORT), '127.0.0.1');
}

// ── IPC handlers ─────────────────────────────────────────────
ipcMain.handle('get-app-version', () => app.getVersion());

// ── Encrypted refresh-token storage (safeStorage) ────────────
const REFRESH_TOKEN_FILE = 'refresh-token.enc';

function getTokenFilePath(): string {
  return getUserDataPath(REFRESH_TOKEN_FILE);
}

ipcMain.handle('save-refresh-token', (_event, token: string): boolean => {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    const encrypted = safeStorage.encryptString(token);
    fs.writeFileSync(getTokenFilePath(), encrypted);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('get-refresh-token', (): string | null => {
  try {
    const filePath = getTokenFilePath();
    if (!fs.existsSync(filePath)) return null;
    if (!safeStorage.isEncryptionAvailable()) return null;
    const encrypted = fs.readFileSync(filePath);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
});

ipcMain.handle('delete-refresh-token', (): boolean => {
  try {
    const filePath = getTokenFilePath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
});

// Save file via native dialog (used for ZIP downloads in Electron)
ipcMain.handle('save-file', async (_event, options: { data: number[]; defaultName: string }) => {
  if (!mainWindow) return { success: false, error: 'No window' };

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: options.defaultName,
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled' };
  }

  try {
    fs.writeFileSync(result.filePath, Buffer.from(options.data));
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
});

app.whenReady().then(() => {
  // Set macOS Dock icon
  if (process.platform === 'darwin') {
    const iconPath = IS_PACKAGED
      ? path.join(process.resourcesPath, 'icon.png')
      : path.join(__dirname, '..', 'client', 'public', 'icon.png');
    app.dock.setIcon(iconPath);
  }

  // Ensure default data files exist in user data dir
  ensureDefaultData();

  // Resolve server entry point
  // In packaged app, server is in extraResources so node_modules, worker_threads, and puppeteer work
  const serverEntry = getExtraResourcePath('server', 'dist', 'app.js');

   // Environment variables for the server process
   const serverEnv: Record<string, string> = {
     ...process.env as Record<string, string>,
     PORT: SERVER_PORT,
     NODE_ENV: IS_PACKAGED ? 'production' : 'development',
     DATA_DIR: getUserDataPath('data'),
     LOG_DIR: getUserDataPath('logs'),
     TEMP_DIR: getUserDataPath('temp'),
     OUTPUT_DIR: getUserDataPath('exports'),
     CLIENT_PATH: getAsarPath('client', 'dist'),
     // Database configuration - use from process.env if set, otherwise use default
     DATABASE_URL: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_KBqY7NVdjE4x@ep-bitter-voice-an6xlilf.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
     // Auth secrets
     JWT_SECRET: process.env.JWT_SECRET || 'payroll-system-secret-key-2026',
     REFRESH_SECRET: process.env.REFRESH_SECRET || 'payroll-refresh-secret-key-2026',
   };

  // Fork the compiled Express backend
  backendProcess = fork(serverEntry, [], {
    env: serverEnv,
    stdio: 'inherit',
  });

  backendProcess.on('error', (err) => {
    console.error('Backend process error:', err);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Cleanup on exit
app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});

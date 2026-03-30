import { app, BrowserWindow, ipcMain } from 'electron';
import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || app.isPackaged;
const SERVER_PORT = process.env.PORT || '4500';

// Set OS-level application name
app.name = 'PMS Application';
app.setName('PMS Application');

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: path.join(__dirname, '../../client/public/icon.png'),
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
  if (IS_PRODUCTION) {
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

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());

app.whenReady().then(() => {
  // Set macOS Dock icon
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../client/public/icon.png'));
  }

  // Fork the compiled Express backend
  backendProcess = fork(path.join(__dirname, '../../server/dist/app.js'), [], {
    env: { ...process.env, PORT: SERVER_PORT, NODE_ENV: IS_PRODUCTION ? 'production' : 'development' },
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

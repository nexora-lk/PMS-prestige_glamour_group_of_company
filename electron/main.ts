import { app, BrowserWindow } from 'electron';
import { fork, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;

// Set OS-level application name
app.name = 'PMS Application';
app.setName('PMS Application');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../../client/public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'PMS Application',
    autoHideMenuBar: true
  });

  // Check if backend is ready and load the URL
  const checkServer = () => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      mainWindow?.loadURL('http://localhost:4500');
    });
    socket.on('error', () => {
      socket.destroy();
      setTimeout(checkServer, 500);
    });
    socket.on('timeout', () => {
      socket.destroy();
      setTimeout(checkServer, 500);
    });
    socket.connect(4500, '127.0.0.1');
  };

  checkServer();
}

app.whenReady().then(() => {
  // Set MacOS Dock Icon natively
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, '../../client/public/icon.png'));
  }

  // Fork the compiled Express app
  backendProcess = fork(path.join(__dirname, '../../server/dist/app.js'), [], {
    env: { ...process.env, PORT: '4500' },
    stdio: 'inherit'
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Cleanup processes on exit
app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});

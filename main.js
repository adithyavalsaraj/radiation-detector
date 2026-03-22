const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = require('electron-is-dev');

let serverProcess;

function startBackend() {
  const serverPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'backend', 'server.js')
    : path.join(__dirname, 'backend', 'server.js');
    
  serverProcess = spawn('node', [serverPath], { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // Correct path relative to the executable
    win.loadFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // In dev mode, we use concurrently to run the server. 
  // In production, we must explicitly spawn the node server.
  if (!isDev) {
    startBackend();
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

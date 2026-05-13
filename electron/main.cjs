const { app, BrowserWindow, Menu } = require('electron');
// Remove the default menu bar
Menu.setApplicationMenu(null);
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show until it's ready to prevent flickering
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Hot Reload logic
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  // Automatically open DevTools in Development so we can catch errors
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

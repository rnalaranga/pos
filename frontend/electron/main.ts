import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';

// __dirname is available in CJS output (which is what vite.electron.config.ts produces)
const DIST = path.join(__dirname, '../dist');
const PUBLIC = app.isPackaged ? DIST : path.join(DIST, '../public');

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  ipcMain.on('window-min', () => win?.minimize());
  ipcMain.on('window-max', () => {
    if (win?.isMaximized()) win?.unmaximize();
    else win?.maximize();
  });
  ipcMain.on('window-close', () => win?.close());

  ipcMain.handle('get-printers', async () => {
    return await win?.webContents.getPrintersAsync();
  });

  ipcMain.handle('print-receipt', async (_event: any, htmlContent: string, options?: { preview?: boolean, deviceName?: string }) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    await printWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    
    return new Promise((resolve, reject) => {
      const printOptions: any = { 
        silent: !options?.preview, 
        printBackground: true, 
        color: false, 
        copies: 1 
      };
      
      if (options?.deviceName && !options?.preview) {
        printOptions.deviceName = options.deviceName;
      }

      printWin.webContents.print(printOptions, (success: boolean, reason: string) => {
        printWin.close();
        if (!success) reject(reason); else resolve(success);
      });
    });
  });

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  const devServerUrl = process.env['VITE_DEV_SERVER_URL'];
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadFile(path.join(DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') { app.quit(); win = null; }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.whenReady().then(createWindow);

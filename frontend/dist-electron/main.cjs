import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "url";
import path from "path";
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  ipcMain.on("window-min", () => win == null ? void 0 : win.minimize());
  ipcMain.on("window-max", () => {
    if (win == null ? void 0 : win.isMaximized()) win == null ? void 0 : win.unmaximize();
    else win == null ? void 0 : win.maximize();
  });
  ipcMain.on("window-close", () => win == null ? void 0 : win.close());
  ipcMain.handle("print-receipt", async (_event, htmlContent) => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    await printWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
    return new Promise((resolve, reject) => {
      printWin.webContents.print(
        { silent: true, printBackground: true, color: false, copies: 1 },
        (success, reason) => {
          printWin.close();
          if (!success) reject(reason);
          else resolve(success);
        }
      );
    });
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.whenReady().then(createWindow);

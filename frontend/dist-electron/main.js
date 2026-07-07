"use strict";
const electron = require("electron");
const path = require("path");
process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = electron.app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  electron.ipcMain.on("window-min", () => win == null ? void 0 : win.minimize());
  electron.ipcMain.on("window-max", () => {
    if (win == null ? void 0 : win.isMaximized()) win == null ? void 0 : win.unmaximize();
    else win == null ? void 0 : win.maximize();
  });
  electron.ipcMain.on("window-close", () => win == null ? void 0 : win.close());
  electron.ipcMain.handle("print-receipt", async (_event, htmlContent, _printerName) => {
    const printWin = new electron.BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    await printWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(htmlContent));
    return new Promise((resolve, reject) => {
      printWin.webContents.print({ silent: true, printBackground: true, color: false, copies: 1 }, (success, reason) => {
        printWin.close();
        if (!success) reject(reason);
        else resolve(success);
      });
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
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
});
electron.app.whenReady().then(createWindow);

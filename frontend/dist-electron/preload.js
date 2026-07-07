"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => electron.ipcRenderer.send("window-min"),
  maximize: () => electron.ipcRenderer.send("window-max"),
  close: () => electron.ipcRenderer.send("window-close"),
  printReceipt: (htmlContent, printerName) => electron.ipcRenderer.invoke("print-receipt", htmlContent, printerName)
});

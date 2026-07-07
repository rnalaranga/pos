var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
import { contextBridge, ipcRenderer } from "electron";
var require_preload = __commonJS({
  "preload.cjs"() {
    contextBridge.exposeInMainWorld("electronAPI", {
      minimize: () => ipcRenderer.send("window-min"),
      maximize: () => ipcRenderer.send("window-max"),
      close: () => ipcRenderer.send("window-close"),
      printReceipt: (htmlContent, printerName) => ipcRenderer.invoke("print-receipt", htmlContent, printerName)
    });
  }
});
export default require_preload();

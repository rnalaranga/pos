import { contextBridge as r, ipcRenderer as e } from "electron";
r.exposeInMainWorld("electronAPI", {
  minimize: () => e.send("window-min"),
  maximize: () => e.send("window-max"),
  close: () => e.send("window-close"),
  getPrinters: () => e.invoke("get-printers"),
  printReceipt: (i, n) => e.invoke("print-receipt", i, n)
});

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  printReceipt: (htmlContent: string, printerName?: string) =>
    ipcRenderer.invoke('print-receipt', htmlContent, printerName),
});

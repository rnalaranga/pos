import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printReceipt: (htmlContent: string, options?: { preview?: boolean, deviceName?: string }) =>
    ipcRenderer.invoke('print-receipt', htmlContent, options),
});

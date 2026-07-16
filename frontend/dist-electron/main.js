import { app as a, BrowserWindow as l, ipcMain as t } from "electron";
import i from "path";
const d = i.join(__dirname, "../dist");
a.isPackaged || i.join(d, "../public");
let e;
function m() {
  e = new l({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    frame: !1,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: i.join(__dirname, "preload.js"),
      nodeIntegration: !1,
      contextIsolation: !0
    }
  }), t.on("window-min", () => e == null ? void 0 : e.minimize()), t.on("window-max", () => {
    e != null && e.isMaximized() ? e == null || e.unmaximize() : e == null || e.maximize();
  }), t.on("window-close", () => e == null ? void 0 : e.close()), t.handle("get-printers", async () => await (e == null ? void 0 : e.webContents.getPrintersAsync())), t.handle("print-receipt", async (u, f, n) => {
    const r = new l({
      show: !1,
      webPreferences: { nodeIntegration: !1, contextIsolation: !0 }
    });
    return await r.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(f)), new Promise((h, w) => {
      const s = {
        silent: !(n != null && n.preview),
        printBackground: !0,
        color: !1,
        copies: 1
      };
      n != null && n.deviceName && !(n != null && n.preview) && (s.deviceName = n.deviceName), r.webContents.print(s, (c, g) => {
        r.close(), c ? h(c) : w(g);
      });
    });
  }), e.webContents.on("did-finish-load", () => {
    e == null || e.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  const o = process.env.VITE_DEV_SERVER_URL;
  o ? e.loadURL(o) : e.loadFile(i.join(d, "index.html"));
}
a.on("window-all-closed", () => {
  process.platform !== "darwin" && (a.quit(), e = null);
});
a.on("activate", () => {
  l.getAllWindows().length === 0 && m();
});
a.whenReady().then(m);

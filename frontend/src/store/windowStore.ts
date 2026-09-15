import { create } from 'zustand';

export type ModuleKey = 
  | 'dashboard' | 'pos' | 'products' | 'categories' 
  | 'inventory' | 'grn' | 'suppliers' | 'customers' 
  | 'settings' | 'reports' | 'warehouses' | 'users' | 'sales_history' | 'receipt_preview';

export interface WinState {
  id: string;
  module: ModuleKey;
  title: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  isMinimized: boolean;
  isMaximized: boolean;
  prevBounds?: { x: number; y: number; width: number; height: number };
  zIndex: number;
  payload?: any;
}

export interface ModuleDef {
  title: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
}

export const MODULE_REGISTRY: Record<ModuleKey, ModuleDef> = {
  dashboard:  { title: 'Dashboard',              icon: '▤',  defaultWidth: 900,  defaultHeight: 600, minWidth: 500, minHeight: 350 },
  pos:        { title: 'POS Terminal',            icon: '⊞',  defaultWidth: 1100, defaultHeight: 720, minWidth: 700, minHeight: 480 },
  products:   { title: 'Product List',            icon: '▦',  defaultWidth: 950,  defaultHeight: 600, minWidth: 500, minHeight: 350 },
  categories: { title: 'Categories',             icon: '▣',  defaultWidth: 700,  defaultHeight: 480, minWidth: 400, minHeight: 300 },
  inventory:  { title: 'Inventory',              icon: '▩',  defaultWidth: 950,  defaultHeight: 600, minWidth: 500, minHeight: 350 },
  grn:        { title: 'Goods Received Notes',   icon: '▤',  defaultWidth: 950,  defaultHeight: 620, minWidth: 500, minHeight: 380 },
  suppliers:  { title: 'Suppliers',              icon: '▦',  defaultWidth: 850,  defaultHeight: 560, minWidth: 450, minHeight: 320 },
  customers:  { title: 'Customers',              icon: '▣',  defaultWidth: 850,  defaultHeight: 560, minWidth: 450, minHeight: 320 },
  warehouses: { title: 'Warehouses',             icon: '⌂',  defaultWidth: 850,  defaultHeight: 560, minWidth: 450, minHeight: 320 },
  settings:   { title: 'System Settings',        icon: '⚙',  defaultWidth: 780,  defaultHeight: 560, minWidth: 500, minHeight: 380 },
  reports:    { title: 'Reports',                icon: '▨',  defaultWidth: 950,  defaultHeight: 640, minWidth: 500, minHeight: 380 },
  users:      { title: 'User Management',        icon: '👥', defaultWidth: 900,  defaultHeight: 600, minWidth: 600, minHeight: 400 },
  sales_history: { title: 'Sales History',       icon: '🧾', defaultWidth: 1000, defaultHeight: 650, minWidth: 700, minHeight: 450 },
  receipt_preview: { title: 'Receipt Preview',   icon: '📄', defaultWidth: 400,  defaultHeight: 650, minWidth: 350, minHeight: 400 },
};

interface WindowStore {
  windows: WinState[];
  zCounter: number;
  openWindow: (module: ModuleKey, payload?: any) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  maximizeWindow: (id: string, wsW: number, wsH: number) => void;
  restoreWindow: (id: string) => void;
  moveWindow: (id: string, x: number, y: number) => void;
  resizeWindow: (id: string, x: number, y: number, w: number, h: number) => void;
  cascadeWindows: () => void;
  tileHorizontal: (wsW: number, wsH: number) => void;
  tileVertical: (wsW: number, wsH: number) => void;
  closeAll: () => void;
}

let wsWidth = 1200;
let wsHeight = 700;

export const setWorkspaceSize = (w: number, h: number) => {
  wsWidth = w; wsHeight = h;
};

const getSavedBounds = (module: string) => {
  try {
    const saved = localStorage.getItem(`win_${module}`);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

const saveBounds = (module: string, x: number, y: number, w: number, h: number) => {
  try {
    localStorage.setItem(`win_${module}`, JSON.stringify({ x, y, w, h }));
  } catch {}
};

export const useWindowStore = create<WindowStore>((set, get) => ({
  windows: [],
  zCounter: 100,

  openWindow: (module, payload) => {
    const { windows, zCounter } = get();
    // If already open with the SAME payload (or no payload), focus it
    const existing = windows.find(w => w.module === module && JSON.stringify(w.payload) === JSON.stringify(payload));
    if (existing) {
      if (existing.isMinimized) {
        set(s => ({
          zCounter: s.zCounter + 1,
          windows: s.windows.map(w => w.id === existing.id
            ? { ...w, isMinimized: false, zIndex: s.zCounter + 1 }
            : w
          )
        }));
      } else {
        get().focusWindow(existing.id);
      }
      return;
    }

    const def = MODULE_REGISTRY[module];
    const saved = getSavedBounds(module);
    const cascade = windows.length * 28;
    const maxX = Math.max(0, wsWidth - (saved?.w ?? def.defaultWidth));
    const maxY = Math.max(0, wsHeight - (saved?.h ?? def.defaultHeight));

    const newWin: WinState = {
      id: `${module}_${Date.now()}`,
      module,
      title: payload?.title || def.title,
      icon: def.icon,
      x: saved ? Math.min(saved.x, maxX) : Math.min(40 + cascade, maxX),
      y: saved ? Math.min(saved.y, maxY) : Math.min(40 + cascade, maxY),
      width: saved?.w ?? def.defaultWidth,
      height: saved?.h ?? def.defaultHeight,
      minWidth: def.minWidth,
      minHeight: def.minHeight,
      isMinimized: false,
      isMaximized: false,
      zIndex: zCounter + 1,
      payload,
    };

    set(s => ({ windows: [...s.windows, newWin], zCounter: s.zCounter + 1 }));
  },

  closeWindow: (id) => {
    const win = get().windows.find(w => w.id === id);
    if (win && !win.isMaximized) saveBounds(win.module, win.x, win.y, win.width, win.height);
    set(s => ({ windows: s.windows.filter(w => w.id !== id) }));
  },

  focusWindow: (id) => {
    set(s => ({
      zCounter: s.zCounter + 1,
      windows: s.windows.map(w => w.id === id ? { ...w, zIndex: s.zCounter + 1 } : w)
    }));
  },

  minimizeWindow: (id) => {
    set(s => ({ windows: s.windows.map(w => w.id === id ? { ...w, isMinimized: true } : w) }));
  },

  maximizeWindow: (id, wsW, wsH) => {
    set(s => ({
      windows: s.windows.map(w => w.id === id ? {
        ...w,
        isMaximized: true,
        prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
        x: 0, y: 0, width: wsW, height: wsH,
      } : w)
    }));
  },

  restoreWindow: (id) => {
    set(s => ({
      windows: s.windows.map(w => {
        if (w.id !== id) return w;
        return {
          ...w,
          isMaximized: false,
          isMinimized: false,
          x: w.prevBounds?.x ?? 60,
          y: w.prevBounds?.y ?? 60,
          width: w.prevBounds?.width ?? MODULE_REGISTRY[w.module].defaultWidth,
          height: w.prevBounds?.height ?? MODULE_REGISTRY[w.module].defaultHeight,
          prevBounds: undefined,
        };
      })
    }));
  },

  moveWindow: (id, x, y) => {
    set(s => ({ windows: s.windows.map(w => w.id === id ? { ...w, x, y } : w) }));
    const win = get().windows.find(w => w.id === id);
    if (win) saveBounds(win.module, x, y, win.width, win.height);
  },

  resizeWindow: (id, x, y, width, height) => {
    set(s => ({ windows: s.windows.map(w => w.id === id ? { ...w, x, y, width, height } : w) }));
    const win = get().windows.find(w => w.id === id);
    if (win) saveBounds(win.module, x, y, width, height);
  },

  cascadeWindows: () => {
    const visible = get().windows.filter(w => !w.isMinimized);
    set(s => ({
      windows: s.windows.map(w => {
        const idx = visible.findIndex(v => v.id === w.id);
        if (idx < 0) return w;
        const def = MODULE_REGISTRY[w.module];
        return { ...w, isMaximized: false, x: 30 + idx * 30, y: 30 + idx * 28, width: def.defaultWidth, height: def.defaultHeight };
      })
    }));
  },

  tileHorizontal: (wsW, wsH) => {
    const visible = get().windows.filter(w => !w.isMinimized);
    if (!visible.length) return;
    const h = Math.floor(wsH / visible.length);
    set(s => ({
      windows: s.windows.map(w => {
        const idx = visible.findIndex(v => v.id === w.id);
        if (idx < 0) return w;
        return { ...w, isMaximized: false, x: 0, y: idx * h, width: wsW, height: h };
      })
    }));
  },

  tileVertical: (wsW, wsH) => {
    const visible = get().windows.filter(w => !w.isMinimized);
    if (!visible.length) return;
    const w = Math.floor(wsW / visible.length);
    set(s => ({
      windows: s.windows.map(win => {
        const idx = visible.findIndex(v => v.id === win.id);
        if (idx < 0) return win;
        return { ...win, isMaximized: false, x: idx * w, y: 0, width: w, height: wsH };
      })
    }));
  },

  closeAll: () => { set({ windows: [] }); },
}));

import { useDialogStore } from '../../store/dialogStore';
import { useState, useRef, useEffect } from 'react';
import { useWindowStore, MODULE_REGISTRY, type ModuleKey } from '../../store/windowStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';

interface MenuItem {
  label: string;
  action?: () => void;
  shortcut?: string;
  separator?: boolean;
  disabled?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { openWindow, windows, cascadeWindows, tileHorizontal, tileVertical, closeAll } = useWindowStore();
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  const getWsSize = () => {
    const ws = document.querySelector('[data-mdi-workspace]') as HTMLElement;
    return ws ? { w: ws.clientWidth, h: ws.clientHeight } : { w: 1200, h: 700 };
  };

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Sale', shortcut: 'F5', action: () => openWindow('pos') },
        { label: 'New Product', action: () => openWindow('products') },
        { separator: true, label: '' },
        { label: 'Sign Out', action: () => { logout(); navigate('/login'); } },
      ]
    },
    {
      label: 'View',
      items: (Object.keys(MODULE_REGISTRY) as ModuleKey[]).map(key => ({
        label: MODULE_REGISTRY[key].title,
        action: () => { openWindow(key); setOpenMenu(null); },
      }))
    },
    {
      label: 'Window',
      items: [
        { label: 'Cascade', action: () => { cascadeWindows(); setOpenMenu(null); } },
        { label: 'Tile Horizontal', action: () => { const s = getWsSize(); tileHorizontal(s.w, s.h); setOpenMenu(null); } },
        { label: 'Tile Vertical', action: () => { const s = getWsSize(); tileVertical(s.w, s.h); setOpenMenu(null); } },
        { separator: true, label: '' },
        { label: 'Close All', action: () => { closeAll(); setOpenMenu(null); } },
        ...(windows.length > 0 ? [{ separator: true, label: '' }] : []),
        ...windows.map(w => ({
          label: (w.isMinimized ? '▁ ' : '▣ ') + w.title,
          action: () => {
            if (w.isMinimized) useWindowStore.getState().restoreWindow(w.id);
            else useWindowStore.getState().focusWindow(w.id);
            setOpenMenu(null);
          }
        }))
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'About Enterprise POS', action: () => useDialogStore.getState().alert('Message', 'Enterprise Stationery POS\nVersion 1.0.0') },
      ]
    }
  ];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center bg-card border-b border-border/50 shrink-0" style={{ height: 22, paddingLeft: 4 }}>
      {menus.map(menu => (
        <div key={menu.label} className="relative">
          <button
            className={`px-3 h-full text-[11px] hover:bg-primary/10 transition-colors ${openMenu === menu.label ? 'bg-primary/15 text-primary' : 'text-foreground'}`}
            style={{ height: 22 }}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div
              className="absolute left-0 top-full z-[9999] bg-card border border-border shadow-xl min-w-[180px]"
              style={{ marginTop: 1 }}
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} className="border-t border-border/50 my-0.5" />
                ) : (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between px-4 py-1 text-[11px] hover:bg-primary/10 hover:text-primary text-left transition-colors disabled:opacity-40"
                    disabled={item.disabled}
                    onClick={() => { item.action?.(); setOpenMenu(null); }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-[10px] text-muted-foreground ml-8">{item.shortcut}</span>}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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

interface Menu { label: string; items: MenuItem[]; }

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
          label: (w.isMinimized ? '– ' : '◈ ') + w.title,
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
        { label: 'About Enterprise POS', action: () => useDialogStore.getState().alert('About', 'Enterprise POS v1.0.0') },
      ]
    }
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex items-center shrink-0 select-none"
      style={{
        height: 22,
        paddingLeft: 8,
        background: '#1c2460',
        borderBottom: '1px solid rgba(247,173,30,0.18)',
        zIndex: 200,
      }}
    >
      {/* Brand mark */}
      <div
        className="flex items-center gap-1 mr-3 pr-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div
          style={{
            width: 13, height: 13, borderRadius: 3,
            background: 'linear-gradient(135deg, #F7AD1E, #e89a00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 7, fontWeight: 900, color: '#26316C',
          }}
        >E</div>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
          EPOS
        </span>
      </div>

      {/* Menu items */}
      {menus.map(menu => (
        <div key={menu.label} className="relative h-full flex items-center">
          <button
            style={{
              height: 22, padding: '0 8px',
              fontSize: 10, fontWeight: 500,
              color: openMenu === menu.label ? '#F7AD1E' : 'rgba(255,255,255,0.6)',
              background: openMenu === menu.label ? 'rgba(247,173,30,0.1)' : 'transparent',
              border: 'none', cursor: 'pointer',
              borderRadius: 3, transition: 'all 0.12s ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              if (openMenu) setOpenMenu(menu.label);
              (e.currentTarget as HTMLElement).style.color = '#F7AD1E';
              if (!openMenu) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={e => {
              if (openMenu !== menu.label) {
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }
            }}
            onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
          >
            {menu.label}
          </button>

          {openMenu === menu.label && (
            <div
              className="absolute top-full left-0 fade-in-up"
              style={{
                marginTop: 3, minWidth: 200, zIndex: 9999,
                background: 'rgba(255,255,255,0.97)',
                backdropFilter: 'blur(20px)',
                borderRadius: 10,
                border: '1px solid rgba(38,49,108,0.1)',
                boxShadow: '0 12px 40px rgba(38,49,108,0.18), 0 2px 8px rgba(0,0,0,0.08)',
                padding: '4px',
              }}
            >
              {menu.items.map((item, i) =>
                item.separator ? (
                  <div key={i} style={{ height: 1, background: 'rgba(38,49,108,0.07)', margin: '3px 8px' }} />
                ) : (
                  <button
                    key={i}
                    className="w-full flex items-center justify-between text-left disabled:opacity-40"
                    style={{
                      padding: '6px 12px', fontSize: 11, fontWeight: 500,
                      color: '#26316C', borderRadius: 7, border: 'none',
                      background: 'transparent', cursor: 'pointer', width: '100%',
                      fontFamily: 'inherit', transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(38,49,108,0.07)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    disabled={item.disabled}
                    onClick={() => { item.action?.(); setOpenMenu(null); }}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: 9, color: '#aaa', background: 'rgba(0,0,0,0.05)', padding: '1px 5px', borderRadius: 4 }}>
                        {item.shortcut}
                      </span>
                    )}
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

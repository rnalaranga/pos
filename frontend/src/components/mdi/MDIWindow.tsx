import { useRef, useCallback } from 'react';
import { Copy, X } from 'lucide-react';
import { useWindowStore, type WinState } from '../../store/windowStore';
import { ModuleRenderer } from './modules';

type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const RESIZE_CURSORS: Record<ResizeDir, string> = {
  n: 'ns-resize', ne: 'nesw-resize', e: 'ew-resize', se: 'nwse-resize',
  s: 'ns-resize', sw: 'nesw-resize', w: 'ew-resize', nw: 'nwse-resize',
};

interface Props {
  win: WinState;
  workspaceRef: React.RefObject<HTMLDivElement>;
}

export default function MDIWindow({ win, workspaceRef }: Props) {
  const {
    focusWindow, closeWindow, minimizeWindow,
    maximizeWindow, restoreWindow, moveWindow, resizeWindow,
  } = useWindowStore();

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeDir = useRef<ResizeDir | null>(null);
  const resizeStart = useRef({ mx: 0, my: 0, wx: 0, wy: 0, ww: 0, wh: 0 });

  const getWsBounds = useCallback(() => {
    const el = workspaceRef.current;
    if (!el) return { width: window.innerWidth, height: window.innerHeight };
    return { width: el.clientWidth, height: el.clientHeight };
  }, [workspaceRef]);

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    if (win.isMaximized) return;
    e.preventDefault();
    focusWindow(win.id);
    isDragging.current = true;
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y };
    const onMove = (me: MouseEvent) => {
      if (!isDragging.current) return;
      const { width: wsW, height: wsH } = getWsBounds();
      const nx = Math.max(0, Math.min(me.clientX - dragOffset.current.x, wsW - win.width));
      const ny = Math.max(0, Math.min(me.clientY - dragOffset.current.y, wsH - 30));
      moveWindow(win.id, nx, ny);
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [win, focusWindow, moveWindow, getWsBounds]);

  const onTitleDblClick = useCallback(() => {
    if (win.isMaximized) restoreWindow(win.id);
    else { const { width, height } = getWsBounds(); maximizeWindow(win.id, width, height); }
  }, [win, maximizeWindow, restoreWindow, getWsBounds]);

  const onResizeMouseDown = useCallback((e: React.MouseEvent, dir: ResizeDir) => {
    if (e.button !== 0) return;
    if (win.isMaximized) return;
    e.preventDefault(); e.stopPropagation();
    focusWindow(win.id);
    isResizing.current = true;
    resizeDir.current = dir;
    resizeStart.current = { mx: e.clientX, my: e.clientY, wx: win.x, wy: win.y, ww: win.width, wh: win.height };
    const onMove = (me: MouseEvent) => {
      if (!isResizing.current || !resizeDir.current) return;
      const dx = me.clientX - resizeStart.current.mx;
      const dy = me.clientY - resizeStart.current.my;
      const { wx, wy, ww, wh } = resizeStart.current;
      const minW = win.minWidth, minH = win.minHeight;
      let nx = wx, ny = wy, nw = ww, nh = wh;
      const d = resizeDir.current;
      if (d.includes('e')) nw = Math.max(minW, ww + dx);
      if (d.includes('s')) nh = Math.max(minH, wh + dy);
      if (d.includes('w')) { nw = Math.max(minW, ww - dx); nx = wx + (ww - nw); }
      if (d.includes('n')) { nh = Math.max(minH, wh - dy); ny = wy + (wh - nh); }
      resizeWindow(win.id, nx, ny, nw, nh);
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [win, focusWindow, resizeWindow]);

  const onMaximize = () => {
    if (win.isMaximized) restoreWindow(win.id);
    else { const { width, height } = getWsBounds(); maximizeWindow(win.id, width, height); }
  };

  if (win.isMinimized) return null;

  return (
    <div
      className="absolute flex flex-col select-none window-open"
      style={{
        left: win.x, top: win.y,
        width: win.width, height: win.height,
        zIndex: win.zIndex,
        borderRadius: win.isMaximized ? 0 : 20,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: win.isMaximized
          ? 'none'
          : '0 10px 40px -10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.15s ease',
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* ── RESIZE HANDLES ── */}
      {!win.isMaximized && (
        <>
          {(['n','s','e','w','ne','nw','se','sw'] as ResizeDir[]).map(dir => (
            <div key={dir} onMouseDown={e => onResizeMouseDown(e, dir)} style={{
              position: 'absolute', zIndex: 10, cursor: RESIZE_CURSORS[dir],
              ...(dir === 'n'  && { top: 0,    left: 8,  right: 8,  height: 4 }),
              ...(dir === 's'  && { bottom: 0, left: 8,  right: 8,  height: 4 }),
              ...(dir === 'e'  && { right: 0,  top: 8,   bottom: 8, width: 4 }),
              ...(dir === 'w'  && { left: 0,   top: 8,   bottom: 8, width: 4 }),
              ...(dir === 'ne' && { top: 0,    right: 0, width: 10, height: 10 }),
              ...(dir === 'nw' && { top: 0,    left: 0,  width: 10, height: 10 }),
              ...(dir === 'se' && { bottom: 0, right: 0, width: 10, height: 10 }),
              ...(dir === 'sw' && { bottom: 0, left: 0,  width: 10, height: 10 }),
            }} />
          ))}
        </>
      )}

      {/* ── TITLE BAR ── */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 48,
          background: '#FFFFFF',
          cursor: win.isMaximized ? 'default' : 'move',
          paddingLeft: 16, paddingRight: 12,
          userSelect: 'none',
          borderBottom: '1px solid #F1F5F9',
        }}
        onMouseDown={onTitleMouseDown}
        onDoubleClick={onTitleDblClick}
      >
        {/* Traffic-light controls */}
        <div className="flex items-center gap-1.5 mr-3 shrink-0">
          <button
            onClick={() => closeWindow(win.id)}
            title="Close"
            style={{
              width: 13, height: 13, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6059, #d03030)',
              border: '0.5px solid rgba(0,0,0,0.25)',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.2)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = ''}
          />
          <button
            onClick={() => minimizeWindow(win.id)}
            title="Minimize"
            style={{
              width: 13, height: 13, borderRadius: '50%',
              background: 'linear-gradient(135deg, #febc2e, #d89900)',
              border: '0.5px solid rgba(0,0,0,0.25)',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = ''}
          />
          <button
            onClick={onMaximize}
            title={win.isMaximized ? 'Restore' : 'Maximize'}
            style={{
              width: 13, height: 13, borderRadius: '50%',
              background: 'linear-gradient(135deg, #28c840, #14a020)',
              border: '0.5px solid rgba(0,0,0,0.25)',
              cursor: 'pointer', padding: 0, flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.filter = ''}
          />
        </div>

        {/* Icon + title */}
        <span style={{ fontSize: 16, opacity: 0.5, marginRight: 10, flexShrink: 0, color: '#0F172A' }}>{win.icon}</span>
        <span style={{
          fontSize: 14, fontWeight: 700,
          color: '#0F172A',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {win.title}
        </span>

        {/* Restore button if maximized */}
        {win.isMaximized && (
          <button
            onClick={onMaximize}
            title="Restore"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'transparent',
              color: '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#F1F5F9';
              (e.currentTarget as HTMLElement).style.color = '#0F172A';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#64748B';
            }}
          >
            <Copy size={10} />
          </button>
        )}

        {/* X for keyboard-friendly close at right */}
        {!win.isMaximized && (
          <button
            onClick={() => closeWindow(win.id)}
            title="Close"
            style={{
              width: 28, height: 28, borderRadius: 8, border: 'none',
              background: 'transparent',
              color: '#64748B', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', marginLeft: 4,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#FEE2E2';
              (e.currentTarget as HTMLElement).style.color = '#DC2626';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#64748B';
            }}
          >
            <X size={10} />
          </button>
        )}
      </div>

      {/* ── CONTENT ── */}
      <div
        className="flex-1 overflow-auto custom-scrollbar flex flex-col p-6 relative"
        style={{ fontSize: '13px', background: '#F8FAFC' }}
      >
        <ModuleRenderer module={win.module} />
      </div>
    </div>
  );
}

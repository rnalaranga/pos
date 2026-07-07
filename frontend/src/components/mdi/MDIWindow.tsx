import { useRef, useCallback } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
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

  // ── DRAG ─────────────────────────────────────────────────────────────
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

  // ── DOUBLE-CLICK TITLE = MAXIMIZE/RESTORE ────────────────────────────
  const onTitleDblClick = useCallback(() => {
    if (win.isMaximized) {
      restoreWindow(win.id);
    } else {
      const { width, height } = getWsBounds();
      maximizeWindow(win.id, width, height);
    }
  }, [win, maximizeWindow, restoreWindow, getWsBounds]);

  // ── RESIZE ───────────────────────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: React.MouseEvent, dir: ResizeDir) => {
    if (e.button !== 0) return;
    if (win.isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    focusWindow(win.id);
    isResizing.current = true;
    resizeDir.current = dir;
    resizeStart.current = { mx: e.clientX, my: e.clientY, wx: win.x, wy: win.y, ww: win.width, wh: win.height };

    const onMove = (me: MouseEvent) => {
      if (!isResizing.current || !resizeDir.current) return;
      const dx = me.clientX - resizeStart.current.mx;
      const dy = me.clientY - resizeStart.current.my;
      const { wx, wy, ww, wh } = resizeStart.current;
      const minW = win.minWidth;
      const minH = win.minHeight;
      let nx = wx, ny = wy, nw = ww, nh = wh;
      const dir = resizeDir.current;

      if (dir.includes('e')) nw = Math.max(minW, ww + dx);
      if (dir.includes('s')) nh = Math.max(minH, wh + dy);
      if (dir.includes('w')) { nw = Math.max(minW, ww - dx); nx = wx + (ww - nw); }
      if (dir.includes('n')) { nh = Math.max(minH, wh - dy); ny = wy + (wh - nh); }

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
    if (win.isMaximized) { restoreWindow(win.id); }
    else { const { width, height } = getWsBounds(); maximizeWindow(win.id, width, height); }
  };

  if (win.isMinimized) return null;

  return (
    <div
      className="absolute flex flex-col shadow-2xl border border-border/70 overflow-hidden select-none"
      style={{
        left: win.x, top: win.y,
        width: win.width, height: win.height,
        zIndex: win.zIndex,
        background: 'hsl(var(--card))',
        borderRadius: win.isMaximized ? 0 : '4px',
        transition: 'box-shadow 0.1s',
      }}
      onMouseDown={() => focusWindow(win.id)}
    >
      {/* ── RESIZE HANDLES ── */}
      {!win.isMaximized && (
        <>
          {(['n','s','e','w','ne','nw','se','sw'] as ResizeDir[]).map(dir => (
            <div
              key={dir}
              onMouseDown={e => onResizeMouseDown(e, dir)}
              style={{
                position: 'absolute', zIndex: 10,
                cursor: RESIZE_CURSORS[dir],
                ...(dir === 'n'  && { top: 0,    left: 4,  right: 4,  height: 5 }),
                ...(dir === 's'  && { bottom: 0, left: 4,  right: 4,  height: 5 }),
                ...(dir === 'e'  && { right: 0,  top: 4,   bottom: 4, width: 5 }),
                ...(dir === 'w'  && { left: 0,   top: 4,   bottom: 4, width: 5 }),
                ...(dir === 'ne' && { top: 0,    right: 0, width: 8,  height: 8 }),
                ...(dir === 'nw' && { top: 0,    left: 0,  width: 8,  height: 8 }),
                ...(dir === 'se' && { bottom: 0, right: 0, width: 8,  height: 8 }),
                ...(dir === 'sw' && { bottom: 0, left: 0,  width: 8,  height: 8 }),
              }}
            />
          ))}
        </>
      )}

      {/* ── TITLE BAR ── */}
      <div
        className="flex items-center shrink-0 border-b border-border/50"
        style={{
          height: 28,
          background: 'hsl(var(--muted))',
          cursor: win.isMaximized ? 'default' : 'move',
          paddingLeft: 8,
          userSelect: 'none',
        }}
        onMouseDown={onTitleMouseDown}
        onDoubleClick={onTitleDblClick}
      >
        <span className="text-xs mr-2 opacity-60">{win.icon}</span>
        <span className="text-[11px] font-medium text-foreground flex-1 truncate">{win.title}</span>

        {/* Window controls */}
        <button
          onClick={() => minimizeWindow(win.id)}
          className="flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          style={{ width: 40, height: 28 }}
          title="Minimize"
        >
          <Minus size={11} />
        </button>
        <button
          onClick={onMaximize}
          className="flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          style={{ width: 40, height: 28 }}
          title={win.isMaximized ? 'Restore' : 'Maximize'}
        >
          {win.isMaximized ? <Copy size={10} /> : <Square size={10} />}
        </button>
        <button
          onClick={() => closeWindow(win.id)}
          className="flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          style={{ width: 40, height: 28, borderRadius: '0 3px 0 0' }}
          title="Close"
        >
          <X size={11} />
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div className="flex-1 overflow-auto custom-scrollbar p-4 flex flex-col" style={{ fontSize: '12px' }}>
        <ModuleRenderer module={win.module} />
      </div>
    </div>
  );
}

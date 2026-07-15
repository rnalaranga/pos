import { useWindowStore } from '../../store/windowStore';
import { X, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AppTaskbar() {
  const { windows, focusWindow, restoreWindow, closeWindow } = useWindowStore();
  const { user } = useAuthStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const maxZ = windows.length > 0 ? Math.max(...windows.map(w => w.zIndex)) : -1;

  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{
        height: 38,
        background: 'rgba(30,39,84,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(247,173,30,0.18)',
        padding: '0 10px',
      }}
    >
      {/* Window tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 pr-4 h-full py-2">
        {windows.length === 0 && (
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', paddingLeft: 4 }}>
            No open windows — click a module above to start
          </span>
        )}
        {windows.map(win => {
          const isActive = win.zIndex === maxZ && !win.isMinimized;
          return (
            <div
              key={win.id}
              className="flex items-center gap-1 h-full group"
              style={{
                maxWidth: 160, minWidth: 80,
                borderRadius: 7,
                background: isActive ? 'rgba(247,173,30,0.18)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isActive ? 'rgba(247,173,30,0.5)' : 'rgba(255,255,255,0.08)'}`,
                padding: '0 4px 0 8px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              <button
                className="flex items-center gap-1.5 flex-1 min-w-0"
                onClick={() => win.isMinimized ? restoreWindow(win.id) : focusWindow(win.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, height: '100%' }}
              >
                <span style={{ fontSize: 11, opacity: 0.75, flexShrink: 0 }}>{win.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#F7AD1E' : 'rgba(255,255,255,0.6)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  flex: 1, textAlign: 'left',
                }}>
                  {win.title}
                </span>
                {win.isMinimized && <Minus size={8} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />}
              </button>
              {/* Close tab button */}
              <button
                onClick={e => { e.stopPropagation(); closeWindow(win.id); }}
                className="flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  width: 14, height: 14, borderRadius: 4, border: 'none',
                  background: 'rgba(255,255,255,0.1)', cursor: 'pointer', flexShrink: 0,
                  color: 'rgba(255,255,255,0.5)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(224,62,62,0.6)';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
                }}
              >
                <X size={8} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Status area */}
      <div className="flex items-center gap-3 shrink-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', paddingLeft: 12 }}>
        <div className="flex items-center gap-1.5">
          <div className="pulse-dot" />
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Connected</span>
        </div>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />

        <div className="flex items-center gap-2">
          <div
            style={{
              width: 22, height: 22, borderRadius: 8,
              background: 'linear-gradient(135deg, #F7AD1E, #e89a00)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#26316C',
              boxShadow: '0 2px 6px rgba(247,173,30,0.4)',
            }}
          >
            {(user?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.2 }}>
              {user?.full_name || 'Admin'}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', lineHeight: 1.2 }}>
              {user?.role || 'Administrator'}
            </span>
          </div>
        </div>

        <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#F7AD1E', lineHeight: 1.25 }}>
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', lineHeight: 1.25 }}>
            {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
    </div>
  );
}

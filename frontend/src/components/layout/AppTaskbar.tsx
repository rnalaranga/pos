import { useWindowStore } from '../../store/windowStore';
import { Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function AppTaskbar() {
  const { windows, focusWindow, restoreWindow } = useWindowStore();
  const { user } = useAuthStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-between h-8 bg-card border-t border-border shrink-0 px-2 select-none">
      {/* Left side: Open window tabs */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar h-full py-1 flex-1 pr-4">
        {windows.map(win => {
          const isActive = win.zIndex === Math.max(...windows.map(w => w.zIndex));
          return (
            <button
              key={win.id}
              onClick={() => win.isMinimized ? restoreWindow(win.id) : focusWindow(win.id)}
              className={`flex items-center gap-1.5 px-3 h-full max-w-[150px] rounded-sm text-[11px] font-medium truncate border transition-colors ${
                isActive && !win.isMinimized
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              title={win.title}
            >
              <span className="opacity-70 text-xs shrink-0">{win.icon}</span>
              <span className="truncate flex-1 text-left">{win.title}</span>
              {win.isMinimized && <Minus size={9} className="shrink-0 opacity-50" />}
            </button>
          );
        })}
      </div>

      {/* Right side: Status indicators */}
      <div className="flex items-center gap-3 shrink-0 h-full border-l border-border/50 pl-3">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
          Connected
        </div>
        
        <div className="w-px h-4 bg-border/50"></div>
        
        <div className="text-[10px] font-medium text-foreground flex flex-col justify-center leading-tight">
          <span>{user?.full_name || 'Admin'}</span>
        </div>

        <div className="w-px h-4 bg-border/50"></div>

        <div className="text-[10px] font-medium text-foreground flex flex-col justify-center leading-tight text-right w-16">
          <span>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span className="text-[9px] text-muted-foreground">{time.toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

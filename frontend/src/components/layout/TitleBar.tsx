import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  // Check if we are running in Electron
  const isElectron = !!(window as any).electronAPI;

  if (!isElectron) {
    return null; // Don't show custom title bar in standard browser mode
  }

  const handleMinimize = () => {
    (window as any).electronAPI?.minimize();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximize();
  };

  const handleClose = () => {
    (window as any).electronAPI?.close();
  };

  return (
    <div className="h-8 bg-background border-b flex items-center justify-between select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center px-4">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">Enterprise POS</span>
      </div>
      <div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button 
          onClick={handleMinimize}
          className="h-full px-4 hover:bg-muted transition-colors flex items-center justify-center"
          title="Minimize"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-4 hover:bg-muted transition-colors flex items-center justify-center"
          title="Maximize"
        >
          <Square className="h-3 w-3" />
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-4 hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center justify-center"
          title="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;

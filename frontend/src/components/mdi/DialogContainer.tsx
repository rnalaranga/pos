import { useRef, useCallback } from 'react';
import { X, AlertCircle, HelpCircle } from 'lucide-react';
import { useDialogStore } from '../../store/dialogStore';

export default function DialogContainer() {
  const { dialogs } = useDialogStore();

  if (dialogs.length === 0) return null;

  return (
    <>
      {/* Background blocker for modal feeling, but allows clicking other windows if non-modal is desired. 
          Since they are alerts/confirms, we make them modal by blocking clicks. */}
      <div className="absolute inset-0 bg-background/20 z-[9998]" />
      
      {dialogs.map((d, index) => (
        <DraggableDialogBox key={d.id} dialog={d} index={index} />
      ))}
    </>
  );
}

function DraggableDialogBox({ dialog, index }: { dialog: any; index: number }) {
  const { resolveDialog } = useDialogStore();
  const boxRef = useRef<HTMLDivElement>(null);
  
  // Basic centered start position, slightly offset for multiple
  const startX = window.innerWidth / 2 - 150 + (index * 20);
  const startY = window.innerHeight / 2 - 75 + (index * 20);

  const isDragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    isDragging.current = true;
    
    if (boxRef.current) {
      const rect = boxRef.current.getBoundingClientRect();
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    const onMove = (me: MouseEvent) => {
      if (!isDragging.current || !boxRef.current) return;
      const nx = me.clientX - dragOffset.current.x;
      const ny = me.clientY - dragOffset.current.y;
      boxRef.current.style.left = `${nx}px`;
      boxRef.current.style.top = `${ny}px`;
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return (
    <div
      ref={boxRef}
      className="absolute shadow-2xl border border-border/80 flex flex-col bg-card select-none z-[9999]"
      style={{
        left: startX, top: startY,
        width: 300, minHeight: 130,
        borderRadius: 4
      }}
    >
      {/* Title Bar */}
      <div 
        className="h-7 bg-muted border-b border-border flex items-center justify-between px-2 cursor-move"
        onMouseDown={onTitleMouseDown}
      >
        <span className="text-[11px] font-medium truncate">{dialog.title}</span>
        <button 
          onClick={() => resolveDialog(dialog.id, false)}
          className="hover:bg-destructive hover:text-destructive-foreground p-0.5 rounded transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex items-start gap-3">
        <div className="mt-0.5">
          {dialog.type === 'alert' ? <AlertCircle size={20} className="text-primary" /> : <HelpCircle size={20} className="text-primary" />}
        </div>
        <div className="text-xs flex-1 whitespace-pre-wrap">{dialog.message}</div>
      </div>

      {/* Footer */}
      <div className="bg-muted/30 p-2 border-t border-border flex justify-end gap-2">
        {dialog.type === 'confirm' && (
          <button 
            onClick={() => resolveDialog(dialog.id, false)}
            className="px-4 py-1 text-xs border border-border rounded hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        )}
        <button 
          onClick={() => resolveDialog(dialog.id, true)}
          className="px-4 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}

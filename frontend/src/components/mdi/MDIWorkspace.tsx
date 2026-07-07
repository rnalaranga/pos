import { useRef, useEffect } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { useWindowStore, setWorkspaceSize } from '../../store/windowStore';
import MDIWindow from './MDIWindow';

export default function MDIWorkspace() {
  const { windows } = useWindowStore();
  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const ref = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    const update = () => {
      if (ref.current) {
        setWorkspaceSize(ref.current.clientWidth, ref.current.clientHeight);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex-1 overflow-hidden"
      style={{
        background: 'hsl(var(--background))',
        backgroundImage: `
          radial-gradient(circle at 1px 1px, hsl(var(--border)/0.4) 1px, transparent 0)
        `,
        backgroundSize: '24px 24px',
      }}
    >
      {windows.map(win => (
        <MDIWindow key={win.id} win={win} workspaceRef={ref} />
      ))}

      {windows.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center opacity-20">
            <div className="text-5xl mb-3">⊞</div>
            <div className="text-sm font-medium">Enterprise POS</div>
            <div className="text-xs mt-1">Open a module from the toolbar above</div>
          </div>
        </div>
      )}
    </div>
  );
}

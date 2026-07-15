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
      data-mdi-workspace
      className="relative flex-1 overflow-hidden workspace-bg"
    >
      {windows.map(win => (
        <MDIWindow key={win.id} win={win} workspaceRef={ref} />
      ))}

      {windows.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-5 text-center" style={{ opacity: 0.35 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 22,
              background: 'linear-gradient(135deg, #26316C, #1e2754)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 38,
              boxShadow: '0 8px 32px rgba(38,49,108,0.25)',
            }}>
              ⊞
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#26316C', letterSpacing: '-0.3px' }}>
                Enterprise POS
              </div>
              <div style={{ fontSize: 12, color: '#26316C', marginTop: 6, opacity: 0.7 }}>
                Open a module from the toolbar above
              </div>
            </div>
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 380,
            }}>
              {['📊 Dashboard', '🛒 POS Terminal', '📦 Products', '📈 Reports'].map(m => (
                <span key={m} style={{
                  padding: '4px 12px', borderRadius: 99,
                  background: 'rgba(38,49,108,0.08)',
                  border: '1px solid rgba(38,49,108,0.12)',
                  fontSize: 11, color: '#26316C', fontWeight: 500,
                }}>{m}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useWindowStore, MODULE_REGISTRY, type ModuleKey } from '../../store/windowStore';

const MODULE_META: Record<string, { icon: string; color: string }> = {
  dashboard:  { icon: '📊', color: 'rgba(99,102,241,0.12)' },
  pos:        { icon: '🛒', color: 'rgba(34,197,94,0.12)' },
  products:   { icon: '📦', color: 'rgba(59,130,246,0.12)' },
  categories: { icon: '🏷️', color: 'rgba(168,85,247,0.12)' },
  inventory:  { icon: '🗃️', color: 'rgba(245,158,11,0.12)' },
  grn:        { icon: '📥', color: 'rgba(236,72,153,0.12)' },
  suppliers:  { icon: '🤝', color: 'rgba(20,184,166,0.12)' },
  customers:  { icon: '👥', color: 'rgba(239,68,68,0.12)' },
  warehouses: { icon: '🏭', color: 'rgba(107,114,128,0.12)' },
  settings:   { icon: '⚙️', color: 'rgba(38,49,108,0.1)' },
  reports:    { icon: '📈', color: 'rgba(247,173,30,0.15)' },
};

export default function ModuleBar() {
  const { openWindow } = useWindowStore();
  const modules = Object.keys(MODULE_REGISTRY) as ModuleKey[];

  return (
    <div
      className="flex items-center shrink-0 overflow-x-auto custom-scrollbar select-none"
      style={{
        height: 48,
        background: '#26316C',
        borderBottom: '1px solid rgba(247,173,30,0.25)',
        padding: '0 10px',
        gap: 4,
      }}
    >
      {modules.map((key) => {
        const mod = MODULE_REGISTRY[key];
        const meta = MODULE_META[key] || { icon: mod.icon, color: 'rgba(255,255,255,0.08)' };
        return (
          <button
            key={key}
            onClick={() => openWindow(key)}
            title={mod.title}
            className="shine"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 34, padding: '0 12px',
              borderRadius: 8, border: '1px solid transparent',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.75)',
              fontSize: 11, fontWeight: 500,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(247,173,30,0.2)';
              el.style.borderColor = 'rgba(247,173,30,0.45)';
              el.style.color = '#F7AD1E';
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 4px 14px rgba(247,173,30,0.25)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(255,255,255,0.06)';
              el.style.borderColor = 'transparent';
              el.style.color = 'rgba(255,255,255,0.75)';
              el.style.transform = '';
              el.style.boxShadow = '';
            }}
            onMouseDown={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0px) scale(0.97)';
            }}
            onMouseUp={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{meta.icon}</span>
            <span>{mod.title}</span>
          </button>
        );
      })}
    </div>
  );
}

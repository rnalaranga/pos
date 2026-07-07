import { useWindowStore, MODULE_REGISTRY, type ModuleKey } from '../../store/windowStore';

export default function ModuleBar() {
  const { openWindow } = useWindowStore();
  const modules = Object.keys(MODULE_REGISTRY) as ModuleKey[];

  return (
    <div className="flex items-center gap-1 p-1 bg-card border-b border-border shadow-sm shrink-0 overflow-x-auto custom-scrollbar">
      {modules.map((key) => {
        const mod = MODULE_REGISTRY[key];
        return (
          <button
            key={key}
            onClick={() => openWindow(key)}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md hover:bg-muted transition-colors whitespace-nowrap text-[11px] font-medium text-foreground/80 hover:text-foreground"
            title={`Open ${mod.title}`}
          >
            <span className="text-sm opacity-80">{mod.icon}</span>
            {mod.title}
          </button>
        );
      })}
    </div>
  );
}

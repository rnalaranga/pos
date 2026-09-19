import { useState, useEffect } from 'react';
import { useWindowStore, MODULE_REGISTRY, type ModuleKey } from '../../store/windowStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import { ChevronRight, ChevronLeft, Building2, LayoutDashboard, ShoppingCart, Package, Tags, Archive, FileDown, Truck, Users, Warehouse, Settings, LineChart, LogOut, Wallet } from 'lucide-react';

const MODULE_META: Record<string, { icon: React.ReactNode }> = {
  dashboard:  { icon: <LayoutDashboard className="w-5 h-5" /> },
  pos:        { icon: <ShoppingCart className="w-5 h-5" /> },
  products:   { icon: <Package className="w-5 h-5" /> },
  categories: { icon: <Tags className="w-5 h-5" /> },
  inventory:  { icon: <Archive className="w-5 h-5" /> },
  grn:        { icon: <FileDown className="w-5 h-5" /> },
  suppliers:  { icon: <Truck className="w-5 h-5" /> },
  customers:  { icon: <Users className="w-5 h-5" /> },
  warehouses: { icon: <Warehouse className="w-5 h-5" /> },
  finance:    { icon: <Wallet className="w-5 h-5" /> },
  settings:   { icon: <Settings className="w-5 h-5" /> },
  reports:    { icon: <LineChart className="w-5 h-5" /> },
};

export default function Sidebar() {
  const { openWindow } = useWindowStore();
  const { settings, fetchSettings } = useSettingsStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, logout } = useAuthStore();
  const allModules = Object.keys(MODULE_REGISTRY) as ModuleKey[];
  const modules = allModules.filter(key => user?.modules?.includes(key));

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
      <div
      className="flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out z-40 shadow-sm"
      style={{
        width: isExpanded ? 200 : 54,
        background: '#ffffff',
        borderRight: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div 
        className={`flex items-center border-b relative transition-all duration-300 ${isExpanded ? 'justify-start' : 'justify-center'}`}
        style={{ borderColor: 'rgba(0,0,0,0.06)', minHeight: '60px' }}
      >
        {isExpanded && (
          <div className="flex-1 p-2 flex items-center justify-center overflow-hidden animate-in fade-in duration-300">
            {settings.company_logo ? (
              <img 
                src={settings.company_logo} 
                alt="Logo" 
                className="object-contain max-h-10 max-w-[140px]"
              />
            ) : (
              <div className="bg-slate-100 rounded-md flex items-center justify-center w-8 h-8">
                <Building2 className="w-5 h-5 text-slate-400" />
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors z-10 ${isExpanded ? 'absolute right-0 rounded-r-none rounded-l-lg' : ''}`}
          title="Toggle Sidebar"
        >
          {isExpanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-2 pb-4 space-y-1">
        {modules.map((key) => {
          const mod = MODULE_REGISTRY[key];
          const meta = MODULE_META[key] || { icon: <Package className="w-5 h-5" /> };
          
          return (
            <button
              key={key}
              onClick={() => {
                openWindow(key);
                if (window.innerWidth <= 768) setIsExpanded(false);
              }}
              title={mod.title}
              className="w-full flex items-center rounded-lg transition-all"
              style={{
                height: 38,
                padding: '0 8px',
                background: 'transparent',
                color: '#475569',
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                justifyContent: isExpanded ? 'flex-start' : 'center'
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(38,49,108,0.06)';
                el.style.color = '#26316C';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'transparent';
                el.style.color = '#475569';
              }}
              onMouseDown={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.97)';
              }}
              onMouseUp={e => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              <span className="flex items-center justify-center" style={{ fontSize: 16, width: 24, minWidth: 24 }}>
                {meta.icon}
              </span>
              <span 
                className="ml-3 text-left overflow-hidden transition-all duration-300"
                style={{ 
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? 'auto' : 0,
                  display: isExpanded ? 'block' : 'none'
                }}
              >
                {mod.title}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-2 border-t border-border shrink-0">
        <button
          onClick={logout}
          title="Sign Out"
          className="w-full flex items-center rounded-lg transition-all text-red-500 hover:bg-red-50 hover:text-red-600"
          style={{
            height: 38,
            padding: '0 8px',
            fontSize: 12, fontWeight: 600,
            cursor: 'pointer', whiteSpace: 'nowrap',
            justifyContent: isExpanded ? 'flex-start' : 'center'
          }}
        >
          <span className="flex items-center justify-center" style={{ width: 24, minWidth: 24 }}>
            <LogOut className="w-5 h-5" />
          </span>
          <span 
            className="ml-3 text-left overflow-hidden transition-all duration-300"
            style={{ 
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 'auto' : 0,
              display: isExpanded ? 'block' : 'none'
            }}
          >
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}

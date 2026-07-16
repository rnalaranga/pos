import { useDialogStore } from '../store/dialogStore';
import { useState, useEffect } from 'react';
import { Save, Store, Receipt, Calculator, Keyboard } from 'lucide-react';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const Settings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [printers, setPrinters] = useState<any[]>([]);

  const { fetchSettings } = useSettingsStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data);
      } catch (error) {
        console.error("Failed to load settings", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchPrinters = async () => {
      if ((window as any).electronAPI?.getPrinters) {
        try {
          const list = await (window as any).electronAPI.getPrinters();
          setPrinters(list);
        } catch (e) {
          console.error("Failed to load printers", e);
        }
      }
    };

    loadData();
    fetchPrinters();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png', 0.8);
        setSettings(prev => ({ ...prev, company_logo: dataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/settings', settings);
      await fetchSettings(); // Refresh global store
      useDialogStore.getState().alert('Message', 'Settings saved successfully');
    } catch (error) {
      useDialogStore.getState().alert('Message', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading Settings...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <button 
          onClick={handleSubmit} 
          disabled={saving}
          className="flex items-center bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Company Settings */}
        <div className="border bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Company Profile</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-slate-100 rounded-md border flex items-center justify-center overflow-hidden shrink-0">
                {settings.company_logo ? (
                  <img src={settings.company_logo} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No Logo</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Company Logo</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="w-full text-sm" />
                <p className="text-xs text-muted-foreground mt-1">Image will be automatically resized for receipts.</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Name</label>
              <input type="text" name="company_name" value={settings.company_name || ''} onChange={handleChange} className="w-full h-10 px-3 rounded-md border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Company Address</label>
              <textarea name="company_address" value={settings.company_address || ''} onChange={handleChange} className="w-full p-3 rounded-md border bg-background min-h-[80px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input type="text" name="company_phone" value={settings.company_phone || ''} onChange={handleChange} className="w-full h-10 px-3 rounded-md border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <input type="email" name="company_email" value={settings.company_email || ''} onChange={handleChange} className="w-full h-10 px-3 rounded-md border bg-background" />
            </div>
          </div>
        </div>

        {/* Receipt Settings */}
        <div className="border bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            <Receipt className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Receipt & Printing</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Receipt Footer Message</label>
              <textarea name="receipt_footer" value={settings.receipt_footer || ''} onChange={handleChange} className="w-full p-3 rounded-md border bg-background min-h-[80px]" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Printer Type</label>
              <select name="printer_type" value={settings.printer_type || '80mm'} onChange={handleChange as any} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="80mm">80mm Thermal Printer</option>
                <option value="58mm">58mm Thermal Printer</option>
                <option value="A4">A4 Standard Printer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Default Printer (Electron Only)</label>
              <select name="default_printer" value={settings.default_printer || ''} onChange={handleChange as any} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">-- Use OS Default --</option>
                {printers.map((p, idx) => (
                  <option key={idx} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input 
                type="checkbox" 
                id="print_preview" 
                name="print_preview" 
                checked={settings.print_preview === 'true'} 
                onChange={(e) => setSettings({...settings, print_preview: e.target.checked ? 'true' : 'false'})}
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="print_preview" className="text-sm font-medium">Show Print Preview Dialog</label>
            </div>
          </div>
        </div>

        {/* POS Shortcuts & Preferences */}
        <div className="border bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">POS Shortcuts</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Add Discount Shortcut</label>
              <select name="shortcut_discount" value={settings.shortcut_discount || 'F2'} onChange={handleChange as any} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">-- None --</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`F${i+1}`}>F{i+1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Print/Place Order Shortcut</label>
              <select name="shortcut_print" value={settings.shortcut_print || 'F4'} onChange={handleChange as any} className="w-full h-10 px-3 rounded-md border bg-background">
                <option value="">-- None --</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i} value={`F${i+1}`}>F{i+1}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="border bg-card rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b pb-3 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Tax & Finance</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Default Tax Rate (%)</label>
              <input type="number" step="0.01" name="tax_rate" value={settings.tax_rate || '0'} onChange={handleChange} className="w-full h-10 px-3 rounded-md border bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency Symbol</label>
              <input type="text" name="currency_symbol" value={settings.currency_symbol || '$'} onChange={handleChange} className="w-full h-10 px-3 rounded-md border bg-background" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

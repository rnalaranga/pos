import { useDialogStore } from '../store/dialogStore';
import { useState, useEffect } from 'react';
import { Save, Store, Receipt, Calculator } from 'lucide-react';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const Settings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value
    });
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

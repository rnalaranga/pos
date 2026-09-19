import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { Plus, Trash2, DollarSign, Building } from 'lucide-react';

const Finance = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'deposits'>('expenses');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const { currencySymbol } = useSettingsStore();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = activeTab === 'expenses' ? '/finance/expenses' : '/finance/bank-deposits';
      let url = endpoint + '?';
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}`;
      
      const res = await api.get(url);
      setData(res.data);
    } catch (e) {
      console.error(e);
      useDialogStore.getState().alert('Error', `Failed to load ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, startDate, endDate]);

  const handleDelete = async (id: number) => {
    const confirmed = await useDialogStore.getState().confirm('Delete', `Are you sure you want to delete this record?`);
    if (!confirmed) return;

    try {
      const endpoint = activeTab === 'expenses' ? `/finance/expenses/${id}` : `/finance/bank-deposits/${id}`;
      await api.delete(endpoint);
      fetchData();
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to delete record');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = activeTab === 'expenses' ? '/finance/expenses' : '/finance/bank-deposits';
      const payload = { ...formData };
      
      if (activeTab === 'expenses') {
        if (!payload.expense_date) payload.expense_date = new Date().toISOString().split('T')[0];
      } else {
        if (!payload.deposit_date) payload.deposit_date = new Date().toISOString().split('T')[0];
      }
      
      await api.post(endpoint, payload);
      setShowAddModal(false);
      setFormData({});
      fetchData();
    } catch (error) {
      useDialogStore.getState().alert('Error', 'Failed to save record');
    }
  };

  const openAddModal = () => {
    setFormData({});
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg border w-max">
          <button 
            onClick={() => setActiveTab('expenses')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'expenses' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /> Expenses</div>
          </button>
          <button 
            onClick={() => setActiveTab('deposits')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'deposits' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <div className="flex items-center gap-2"><Building className="w-4 h-4" /> Bank Deposits</div>
          </button>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9 w-full sm:w-36 rounded-md border border-input px-3 text-sm" />
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-9 w-full sm:w-36 rounded-md border border-input px-3 text-sm" />
          <button onClick={openAddModal} className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium shrink-0">
            <Plus className="h-4 w-4 mr-2" /> Add {activeTab === 'expenses' ? 'Expense' : 'Deposit'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">{activeTab === 'expenses' ? 'Category' : 'Bank Name'}</th>
              <th className="px-6 py-4 font-medium">{activeTab === 'expenses' ? 'Description' : 'Reference'}</th>
              <th className="px-6 py-4 font-medium">Added By</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No records found.</td></tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-6 py-4">{new Date(row.expense_date || row.deposit_date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium">{row.category || row.bank_name}</td>
                  <td className="px-6 py-4">{row.description || row.reference_number || '-'}</td>
                  <td className="px-6 py-4">{row.user_name}</td>
                  <td className="px-6 py-4 text-right font-semibold">{currencySymbol}{Number(row.amount).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleDelete(row.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-md transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-background w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Add {activeTab === 'expenses' ? 'Expense' : 'Bank Deposit'}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {activeTab === 'expenses' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input type="date" required value={formData.expense_date || new Date().toISOString().split('T')[0]} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full h-10 px-3 rounded-md border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
                    <select required value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-10 px-3 rounded-md border bg-background">
                      <option value="">Select Category</option>
                      <option value="Utility Bills">Utility Bills</option>
                      <option value="Salaries">Salaries</option>
                      <option value="Petty Cash">Petty Cash</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Transport">Transport</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 rounded-md border h-20" placeholder="Optional details..."></textarea>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date *</label>
                    <input type="date" required value={formData.deposit_date || new Date().toISOString().split('T')[0]} onChange={e => setFormData({...formData, deposit_date: e.target.value})} className="w-full h-10 px-3 rounded-md border" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name *</label>
                    <input type="text" required value={formData.bank_name || ''} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="w-full h-10 px-3 rounded-md border" placeholder="e.g. Commercial Bank" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Reference Number</label>
                    <input type="text" value={formData.reference_number || ''} onChange={e => setFormData({...formData, reference_number: e.target.value})} className="w-full h-10 px-3 rounded-md border" placeholder="Optional" />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{currencySymbol}</span>
                  <input type="number" step="0.01" required value={formData.amount || ''} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="w-full h-10 pl-8 pr-3 rounded-md border" placeholder="0.00" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-md hover:bg-muted text-sm font-medium transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;

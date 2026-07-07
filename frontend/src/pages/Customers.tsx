import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, FileText, DollarSign } from 'lucide-react';
import api from '../api/axios';

const Customers = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', customer_type: 'Walk-in', credit_limit: 0
  });

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  const { currencySymbol } = useSettingsStore();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (cust: any) => {
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      customer_type: cust.customer_type || 'Walk-in',
      credit_limit: cust.credit_limit || 0
    });
    setEditingId(cust.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await useDialogStore.getState().confirm('Confirm', 'Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'Walk-in', credit_limit: 0 });
    setEditingId(null);
  };

  const handleOpenLedger = async (cust: any) => {
    setActiveCustomer(cust);
    try {
      const res = await api.get(`/customers/${cust.id}/ledger`);
      setLedgerData(res.data);
      setLedgerOpen(true);
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to load ledger');
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${activeCustomer.id}/payments`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: paymentRef
      });
      useDialogStore.getState().alert('Success', 'Payment recorded successfully');
      setPaymentAmount(''); setPaymentRef('');
      
      const res = await api.get(`/customers/${activeCustomer.id}/ledger`);
      setLedgerData(res.data);
      fetchData(); 
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to process payment');
    }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium">
            <Plus className="h-4 w-4 mr-2" /> Add Customer
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Balance</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No customers found.</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{c.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {c.phone && <div>{c.phone}</div>}
                      {c.email && <div className="text-xs">{c.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${c.customer_type === 'Credit' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-muted'}`}>{c.customer_type}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={Number(c.outstanding_balance) > 0 ? 'text-destructive font-medium' : ''}>{currencySymbol}{Number(c.outstanding_balance).toFixed(2)}</div>
                      {c.customer_type === 'Credit' && <div className="text-xs text-muted-foreground">Limit: ${Number(c.credit_limit).toFixed(2)}</div>}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleOpenLedger(c)} className="text-green-600 hover:text-green-800 p-1" title="Ledger & Payments"><FileText className="h-4 w-4" /></button>
                      <button onClick={() => handleEdit(c)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive/80 p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-lg">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary">
                    <option value="Walk-in">Walk-in</option>
                    <option value="Registered">Registered</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                {formData.customer_type === 'Credit' && (
                  <div><label className="block text-sm font-medium mb-1">Credit Limit</label><input type="number" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required /></div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 bg-muted text-muted-foreground rounded-md hover:bg-muted-foreground hover:text-background transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ledgerOpen && activeCustomer && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-card rounded-xl shadow-2xl border border-border w-full max-w-[95vw] h-[95vh] flex flex-col">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" /> 
                Ledger: {activeCustomer.name}
              </h2>
              <button onClick={() => setLedgerOpen(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 border-r border-border overflow-auto p-4 custom-scrollbar">
                <h3 className="font-semibold text-lg mb-3">Transaction History</h3>
                <table className="w-full text-base text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-sm">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Ref/Notes</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4">No transactions</td></tr>
                    ) : ledgerData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{new Date(row.date).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium">
                          <span className={row.type === 'Invoice' ? 'text-destructive' : 'text-green-600'}>{row.type}</span>
                        </td>
                        <td className="px-3 py-2">{row.ref} {row.notes ? `(${row.notes})` : ''}</td>
                        <td className="px-3 py-2 text-right">{currencySymbol}{Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="w-full lg:w-[400px] p-6 bg-muted/10 border-l border-border flex flex-col">
                <div className="bg-card border border-border rounded-lg p-6 mb-6 text-center shadow-sm">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-medium">Outstanding Balance</div>
                  <div className={`text-4xl font-bold ${Number(activeCustomer.outstanding_balance) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {currencySymbol}{Number(activeCustomer.outstanding_balance).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Loyalty Points: <span className="font-bold text-primary">{activeCustomer.loyalty_points}</span>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 border-b pb-2">
                  <DollarSign className="h-5 w-5 text-green-600" /> Receive Payment
                </h3>
                <form onSubmit={handleMakePayment} className="space-y-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Amount *</label>
                    <input type="number" step="0.01" min="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="w-full h-10 px-3 text-base rounded border border-input bg-background focus:ring-2 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Method *</label>
                    <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full h-10 px-3 text-base rounded border border-input bg-background focus:ring-2 focus:ring-primary">
                      <option>Cash</option>
                      <option>Card</option>
                      <option>Bank Transfer</option>
                      <option>Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Reference No</label>
                    <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="w-full h-10 px-3 text-base rounded border border-input bg-background focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="pt-4 mt-auto">
                    <button type="submit" className="w-full h-12 bg-green-600 text-white rounded-md font-bold text-lg hover:bg-green-700 transition-colors shadow-sm">
                      Record Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

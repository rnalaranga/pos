import { useState, useEffect } from 'react';
import { Plus, Search, FileText, DollarSign, X } from 'lucide-react';
import api from '../api/axios';
import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import GRNPreviewModal from '../components/modals/GRNPreviewModal';

const GRN = () => {
  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [previewGrnId, setPreviewGrnId] = useState<number | null>(null);
  const { currencySymbol } = useSettingsStore();
  
  // Create GRN State
  const [isCreating, setIsCreating] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    supplier_id: '', reference_number: `GRN-${Date.now()}`, notes: ''
  });
  
  const [items, setItems] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [itemForm, setItemForm] = useState({ quantity: 1, purchase_price: 0 });

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeGrn, setActiveGrn] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    reference_number: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/grn');
      setGrns(res.data);
    } catch (error) {
      console.error("Failed to fetch GRNs");
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products')
      ]);
      setSuppliers(supRes.data);
      setProducts(prodRes.data.filter((p: any) => !p.is_service));
    } catch (error) {
      console.error("Failed to fetch dependencies");
    }
  };

  useEffect(() => {
    fetchData();
    fetchDependencies();
  }, []);

  const handleCreateNew = () => {
    setFormData({ supplier_id: '', reference_number: `GRN-${Date.now()}`, notes: '' });
    setItems([]);
    setIsCreating(true);
  };

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProduct(prodId);
    if (prodId) {
      const p = products.find(p => p.id.toString() === prodId);
      if (p) setItemForm({ quantity: 1, purchase_price: Number(p.purchase_price) || 0 });
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    const p = products.find(p => p.id.toString() === selectedProduct);
    if (!p) return;
    
    setItems([...items, {
      product_id: p.id,
      name: p.name,
      quantity: itemForm.quantity,
      purchase_price: itemForm.purchase_price,
      total: itemForm.quantity * itemForm.purchase_price
    }]);
    
    setSelectedProduct('');
    setItemForm({ quantity: 1, purchase_price: 0 });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return useDialogStore.getState().alert('Message', 'Add at least one item');
    
    if (!await useDialogStore.getState().confirm('Confirm GRN', 'Are you sure you want to complete this GRN? This will immediately update your stock levels.')) {
      return;
    }
    
    try {
      const total_amount = items.reduce((acc, item) => acc + item.total, 0);
      await api.post('/grn', {
        ...formData,
        total_amount,
        items
      });
      setIsCreating(false);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to create GRN');
    }
  };

  const filteredGrns = grns.filter(g => {
    const matchesSearch = g.reference_number.toLowerCase().includes(search.toLowerCase()) || 
                          (g.supplier_name && g.supplier_name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSupplier = selectedSupplier ? String(g.supplier_id) === String(selectedSupplier) : true;
    
    let matchesDate = true;
    if (startDate || endDate) {
      const grnDate = new Date(g.created_at).setHours(0,0,0,0);
      if (startDate && grnDate < new Date(startDate).setHours(0,0,0,0)) matchesDate = false;
      if (endDate && grnDate > new Date(endDate).setHours(0,0,0,0)) matchesDate = false;
    }
    
    return matchesSearch && matchesSupplier && matchesDate;
  });

  const handleOpenPayment = (grn: any) => {
    setActiveGrn(grn);
    setPaymentForm({
      amount: (Number(grn.total_amount) - Number(grn.paid_amount)).toFixed(2),
      payment_method: 'Cash',
      reference_number: '',
      notes: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGrn) return;
    try {
      await api.post(`/suppliers/${activeGrn.supplier_id}/payments`, {
        ...paymentForm,
        grn_id: activeGrn.id
      });
      useDialogStore.getState().alert('Success', 'Payment recorded and applied to invoice successfully!');
      setIsPaymentModalOpen(false);
      fetchData(); // Refresh GRNs
    } catch (error) {
      useDialogStore.getState().alert('Error', 'Failed to record payment');
    }
  };

  if (isCreating) {
    const totalAmount = items.reduce((acc, item) => acc + item.total, 0);
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight flex items-center"><FileText className="mr-2 h-6 w-6" /> Create GRN</h1>
          <button onClick={() => setIsCreating(false)} className="px-4 py-2 bg-muted rounded hover:bg-muted-foreground hover:text-background transition-colors">Back to List</button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border bg-card p-4 rounded-xl shadow-sm h-fit space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">GRN Details</h3>
            <div>
              <label className="block text-sm font-medium mb-1">Supplier *</label>
              <select required value={formData.supplier_id} onChange={(e) => setFormData({...formData, supplier_id: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background">
                <option value="">Select Supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ref Number *</label>
              <input required type="text" value={formData.reference_number} onChange={(e) => setFormData({...formData, reference_number: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} className="w-full p-2 rounded-md border border-input bg-background h-24" />
            </div>
          </div>

          <div className="md:col-span-2 border bg-card p-4 rounded-xl shadow-sm space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Add Items</h3>
            <form onSubmit={handleAddItem} className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Product</label>
                <select required value={selectedProduct} onChange={handleProductSelect} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm">
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                </select>
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium mb-1">Qty</label>
                <input required type="number" min="1" value={itemForm.quantity} onChange={(e) => setItemForm({...itemForm, quantity: parseInt(e.target.value) || 1})} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" />
              </div>
              <div className="w-32">
                <label className="block text-xs font-medium mb-1">Unit Cost</label>
                <input required type="number" step="0.01" min="0" value={itemForm.purchase_price} onChange={(e) => setItemForm({...itemForm, purchase_price: parseFloat(e.target.value) || 0})} className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm" />
              </div>
              <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground rounded hover:bg-primary/90 text-sm font-medium">Add</button>
            </form>

            <div className="mt-4 border rounded overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-xs">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Cost</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && <tr><td colSpan={5} className="text-center py-4 text-muted-foreground">No items added</td></tr>}
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{currencySymbol}{Number(item.purchase_price).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{currencySymbol}{Number(item.total).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right"><button type="button" onClick={() => handleRemoveItem(idx)} className="text-destructive text-xs">Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-xl">Total Amount: <span className="font-bold text-primary">{currencySymbol}{totalAmount.toFixed(2)}</span></div>
              <button onClick={handleSubmitGRN} disabled={items.length === 0 || !formData.supplier_id} className="h-10 px-6 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50">Complete GRN</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Good Receive Notes</h1>
          <button onClick={handleCreateNew} className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium">
            <Plus className="h-4 w-4 mr-2" /> New GRN
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" placeholder="Search GRN number..." 
              value={search} onChange={(e) => setSearch(e.target.value)} 
              className="pl-9 h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
            />
          </div>
          <select 
            value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}
            className="h-9 w-full lg:w-48 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input 
              type="date" value={startDate} onChange={e => setStartDate(e.target.value)} 
              className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" title="From Date"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <input 
              type="date" value={endDate} onChange={e => setEndDate(e.target.value)} 
              className="h-9 w-36 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" title="To Date"
            />
          </div>
        </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Reference No.</th>
                <th className="px-6 py-4 font-medium">Supplier</th>
                <th className="px-6 py-4 font-medium">Created By</th>
                <th className="px-6 py-4 font-medium text-right">Total Amount</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : filteredGrns.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No GRNs found.</td></tr>
              ) : (
                filteredGrns.map((g) => (
                  <tr key={g.id} onClick={() => setPreviewGrnId(g.id)} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-6 py-4 text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium text-primary hover:underline">{g.reference_number}</td>
                    <td className="px-6 py-4">{g.supplier_name}</td>
                    <td className="px-6 py-4">{g.user_name}</td>
                    <td className="px-6 py-4 text-right font-semibold">
                      <div>{currencySymbol}{Number(g.total_amount).toFixed(2)}</div>
                      {Number(g.paid_amount) > 0 && <div className="text-xs text-muted-foreground mt-1">Paid: {currencySymbol}{Number(g.paid_amount).toFixed(2)}</div>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${g.payment_status === 'Paid' ? 'bg-green-100 text-green-800' : g.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {g.payment_status || 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(!g.payment_status || g.payment_status !== 'Paid') && (
                        <button onClick={(e) => { e.stopPropagation(); handleOpenPayment(g); }} className="text-primary hover:text-primary/80 flex items-center justify-end w-full" title="Pay Invoice">
                          <DollarSign className="h-4 w-4 mr-1" /> Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isPaymentModalOpen && activeGrn && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border shadow-lg rounded-xl w-full max-w-md animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold">Record Payment (Invoice: {activeGrn.reference_number})</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-4 space-y-4">
              <div className="bg-muted p-3 rounded-lg flex justify-between items-center text-sm mb-2">
                <span>Invoice Total: {currencySymbol}{Number(activeGrn.total_amount).toFixed(2)}</span>
                <span className="font-bold text-destructive">Due: {currencySymbol}{(Number(activeGrn.total_amount) - Number(activeGrn.paid_amount)).toFixed(2)}</span>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input 
                  type="number" step="0.01" max={(Number(activeGrn.total_amount) - Number(activeGrn.paid_amount)).toFixed(2)}
                  value={paymentForm.amount} onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select 
                  value={paymentForm.payment_method} onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <input 
                  type="text" value={paymentForm.reference_number} onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea 
                  value={paymentForm.notes} onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="w-full p-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary h-20"
                />
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full h-10 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors">Apply Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewGrnId && (
        <GRNPreviewModal grnId={previewGrnId} onClose={() => setPreviewGrnId(null)} />
      )}
    </div>
  );
};

export default GRN;

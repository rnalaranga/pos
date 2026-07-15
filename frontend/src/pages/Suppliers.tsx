import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Search, FileText, DollarSign, Printer, ExternalLink } from 'lucide-react';
import api from '../api/axios';
import GRNPreviewModal from '../components/modals/GRNPreviewModal';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { currencySymbol } = useSettingsStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    company_name: '', contact_person: '', phone: '', email: '', address: ''
  });

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [activeSupplier, setActiveSupplier] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');
  
  const [previewGrnId, setPreviewGrnId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers');
      setSuppliers(res.data);
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
        await api.put(`/suppliers/${editingId}`, formData);
      } else {
        await api.post('/suppliers', formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (sup: any) => {
    setFormData({
      company_name: sup.company_name,
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || ''
    });
    setEditingId(sup.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await useDialogStore.getState().confirm('Confirm', 'Delete this supplier?')) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ company_name: '', contact_person: '', phone: '', email: '', address: '' });
    setEditingId(null);
  };

  const handleOpenLedger = async (sup: any) => {
    setActiveSupplier(sup);
    try {
      const res = await api.get(`/suppliers/${sup.id}/ledger`);
      setLedgerData(res.data);
      setLedgerOpen(true);
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to load ledger');
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/suppliers/${activeSupplier.id}/payments`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: paymentRef
      });
      useDialogStore.getState().alert('Success', 'Payment recorded successfully');
      setPaymentAmount(''); setPaymentRef('');
      
      // Refresh
      const res = await api.get(`/suppliers/${activeSupplier.id}/ledger`);
      setLedgerData(res.data);
      fetchData(); // Refresh supplier list to get new balance
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to process payment');
    }
  };

  const handlePrintVoucher = (row: any) => {
    const printHtml = `
      <html>
        <head>
          <title>Payment Voucher</title>
          <style>
            body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .label { font-weight: bold; width: 150px; }
            .value { flex: 1; }
            .amount { font-size: 24px; font-weight: bold; margin-top: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PAYMENT VOUCHER</h2>
          </div>
          <div class="row"><div class="label">Date:</div><div class="value">${new Date(row.date).toLocaleString()}</div></div>
          <div class="row"><div class="label">Supplier:</div><div class="value">${activeSupplier?.company_name}</div></div>
          <div class="row"><div class="label">Reference No:</div><div class="value">${row.ref || 'N/A'}</div></div>
          ${row.grn_ref ? `<div class="row"><div class="label">For Invoice (GRN):</div><div class="value">${row.grn_ref}</div></div>` : ''}
          <div class="row"><div class="label">Notes:</div><div class="value">${row.notes || 'N/A'}</div></div>
          <div class="amount">Total Paid: ${currencySymbol}${Number(row.amount).toFixed(2)}</div>
          
          <div style="margin-top: 50px; display: flex; justify-content: space-between;">
            <div style="border-top: 1px solid black; padding-top: 5px; width: 200px; text-align: center;">Authorized By</div>
            <div style="border-top: 1px solid black; padding-top: 5px; width: 200px; text-align: center;">Received By</div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
      setTimeout(() => {
        win.print();
        win.close();
      }, 250);
    }
  };

  const filtered = suppliers.filter(s => s.company_name.toLowerCase().includes(search.toLowerCase()) || (s.contact_person && s.contact_person.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input type="text" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-border bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
          </div>
          <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center btn-primary px-4 py-2 h-9 text-sm">
            <Plus className="h-4 w-4 mr-2" /> Add Supplier
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Company Name</th>
                <th className="px-6 py-4 font-medium">Contact Person</th>
                <th className="px-6 py-4 font-medium">Contact Details</th>
                <th className="px-6 py-4 font-medium">Balance</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No suppliers found.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-base">{s.company_name}</td>
                    <td className="px-6 py-4">{s.contact_person || '-'}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {s.phone && <div>{s.phone}</div>}
                      {s.email && <div className="text-xs">{s.email}</div>}
                    </td>
                    <td className="px-6 py-4">
                      <div className={Number(s.outstanding_balance) > 0 ? 'text-destructive font-medium' : ''}>{currencySymbol}{Number(s.outstanding_balance).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => handleOpenLedger(s)} className="text-green-600 hover:text-green-800 p-1" title="Ledger & Payments"><FileText className="h-4 w-4" /></button>
                      <button onClick={() => handleEdit(s)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(s.id)} className="text-destructive hover:text-destructive/80 p-1" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-border w-full max-w-lg relative">
            <h2 className="text-xl font-bold mb-6 text-foreground">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Company Name *</label><input type="text" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required /></div>
              <div><label className="block text-sm font-medium mb-1">Contact Person</label><input type="text" value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary min-h-[80px]" /></div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 h-12 btn-primary">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {ledgerOpen && activeSupplier && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-[95vw] h-[95vh] flex flex-col relative overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" /> 
                Ledger: {activeSupplier.company_name}
              </h2>
              <button onClick={() => setLedgerOpen(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Ledger Table */}
              <div className="flex-1 border-r border-border overflow-auto p-4 custom-scrollbar">
                <h3 className="font-semibold text-lg mb-3">Transaction History</h3>
                <table className="w-full text-base text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-sm">
                    <tr>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Reference</th>
                      <th className="px-3 py-2 font-medium">Notes</th>
                      <th className="px-3 py-2 font-medium text-right">Amount</th>
                      <th className="px-3 py-2 font-medium text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-4">No transactions</td></tr>
                    ) : ledgerData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{new Date(row.date).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium">
                          <span className={row.type === 'GRN' ? 'text-destructive' : 'text-green-600'}>{row.type}</span>
                          {row.type === 'Payment' && row.grn_ref && <span className="text-xs text-muted-foreground ml-2">(for {row.grn_ref})</span>}
                        </td>
                        <td className="px-3 py-2">
                          {row.type === 'GRN' && row.grn_id ? (
                            <button onClick={() => setPreviewGrnId(row.grn_id)} className="text-primary hover:underline flex items-center gap-1 font-medium">
                              {row.ref} <ExternalLink className="h-3 w-3" />
                            </button>
                          ) : (
                            row.ref || '-'
                          )}
                        </td>
                        <td className="px-3 py-2">{row.notes || '-'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{currencySymbol}{Number(row.amount).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {row.type === 'Payment' && (
                            <button onClick={() => handlePrintVoucher(row)} className="text-primary hover:text-primary/80 inline-flex items-center" title="Print Voucher">
                              <Printer className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Payment Form */}
              <div className="w-full lg:w-[400px] p-6 bg-muted/20 border-l border-border flex flex-col">
                <div className="bg-white border border-border rounded-xl p-6 mb-6 text-center shadow-sm">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-medium">Outstanding Balance</div>
                  <div className={`text-4xl font-bold ${Number(activeSupplier.outstanding_balance) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {currencySymbol}{Number(activeSupplier.outstanding_balance).toFixed(2)}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 border-b pb-2">
                  <DollarSign className="h-5 w-5 text-green-600" /> Make Payment
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
                    <button type="submit" className="w-full h-12 btn-primary shadow-sm bg-green-600 hover:bg-green-700">
                      Record Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {previewGrnId && (
        <GRNPreviewModal grnId={previewGrnId} onClose={() => setPreviewGrnId(null)} />
      )}
    </div>
  );
};

export default Suppliers;

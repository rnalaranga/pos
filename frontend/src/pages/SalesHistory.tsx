import { useState, useEffect } from 'react';
import { useDialogStore } from '../store/dialogStore';
import { Search, Calendar, Filter, Receipt, Download, FileText } from 'lucide-react';
import api from '../api/axios';
import { renderToString } from 'react-dom/server';
import { Receipt80mm } from '../components/pos/Receipt';
import { X, Printer } from 'lucide-react';

export interface SaleRecord {
  id: number;
  invoice_number: string;
  customer_id: number | null;
  customer_name: string | null;
  user_id: number;
  cashier_name: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method: string;
  amount_paid: number;
  balance: number;
  status: string;
  created_at: string;
}

const SalesHistory = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [settingsMap, setSettingsMap] = useState<any>({});

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashierId, setCashierId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Dropdowns
  const [users, setUsers] = useState<{ id: number; full_name: string }[]>([]);

  const fetchFiltersData = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to load users for filter");
    }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (cashierId) params.append('cashier_id', cashierId);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);

      const res = await api.get(`/sales?${params.toString()}`);
      setSales(res.data);
    } catch (err) {
      useDialogStore.getState().alert('Error', 'Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
    fetchSales();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCashierId('');
    setMinAmount('');
    setMaxAmount('');
    // Wait for state to update then fetch
    setTimeout(fetchSales, 0);
  };

  const handleExportExcel = () => {
    if (sales.length === 0) {
      useDialogStore.getState().alert('Export Error', 'No data to export.');
      return;
    }
    const headers = ['Date', 'Invoice No', 'Cashier', 'Customer', 'Payment Method', 'Amount'];
    const csvRows = [headers.join(',')];
    
    sales.forEach(s => {
      const date = new Date(s.created_at).toLocaleString();
      const invoice = s.invoice_number;
      const cashier = s.cashier_name || 'System';
      const customer = s.customer_name || 'Walk-in';
      const payment = s.payment_method;
      const amount = parseFloat(s.total_amount as any).toFixed(2);
      
      csvRows.push(`"${date}","${invoice}","${cashier}","${customer}","${payment}","${amount}"`);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreviewReceipt = async (saleId: number) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      const saleData = res.data;
      
      const settingsRes = await api.get('/settings');
      setSettingsMap(settingsRes.data);
      setPreviewData(saleData);
    } catch (err) {
      console.error(err);
      useDialogStore.getState().alert('Error', 'Failed to load receipt');
    }
  };

  const handlePrintPreview = () => {
    if (!previewData) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const receiptHtml = renderToString(
        <Receipt80mm 
          invoiceNumber={previewData.invoice_number}
          cashierName={previewData.cashier_name || 'System'}
          date={new Date(previewData.created_at).toLocaleString()}
          items={previewData.items.map((i: any) => ({
            name: i.product_name,
            quantity: i.quantity,
            unit_price: parseFloat(i.unit_price),
            subtotal: parseFloat(i.subtotal)
          }))}
          subtotal={parseFloat(previewData.subtotal)}
          discount={parseFloat(previewData.discount)}
          tax={parseFloat(previewData.tax)}
          total={parseFloat(previewData.total_amount)}
          amountPaid={parseFloat(previewData.amount_paid)}
          paymentMethod={previewData.payment_method}
          companyName={settingsMap.company_name}
          companyAddress={settingsMap.company_address}
          footerMessage={settingsMap.receipt_footer}
          currencySymbol={settingsMap.currency_symbol}
        />
      );
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${previewData.invoice_number}</title>
            <style>
              body { margin: 0; padding: 0; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .text-sm { font-size: 14px; }
              .text-xs { font-size: 12px; }
              .mb-1 { margin-bottom: 4px; }
              .mb-2 { margin-bottom: 8px; }
              .mb-4 { margin-bottom: 16px; }
              .pb-2 { padding-bottom: 8px; }
              .py-1 { padding-top: 4px; padding-bottom: 4px; }
              .pt-2 { padding-top: 8px; }
              .border-b { border-bottom: 1px dashed black; }
              .border-t { border-top: 1px solid black; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-right { text-align: right; }
              .w-1\\/2 { width: 50%; }
              .w-1\\/6 { width: 16.666%; }
              .w-1\\/3 { width: 33.333%; }
              .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            </style>
          </head>
          <body>${receiptHtml}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const totalFilteredSales = sales.reduce((sum, s) => sum + parseFloat(s.total_amount as any), 0);

  return (
    <div className="flex flex-col h-full bg-background text-foreground gap-4">
      {/* Header & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-sm shrink-0">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Sales History</h2>
            <p className="text-muted-foreground text-sm">View and filter all bills generated by cashiers.</p>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex gap-2 mb-2">
              <button onClick={handleExportExcel} className="h-8 px-3 bg-emerald-50 text-emerald-600 rounded-lg font-medium hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Export Excel
              </button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1">Total Found</p>
              <p className="text-2xl font-bold text-primary">Rs. {totalFilteredSales.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleFilterSubmit} className="grid grid-cols-6 gap-3">
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Cashier</label>
            <select value={cashierId} onChange={e => setCashierId(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white">
              <option value="">All Cashiers</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Min Amount</label>
            <input type="number" placeholder="Rs 0.00" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-1">
            <label className="block text-xs font-semibold mb-1 text-muted-foreground">Max Amount</label>
            <input type="number" placeholder="Rs Max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="col-span-1 flex items-end gap-2">
            <button type="submit" className="h-10 flex-1 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center shadow-sm">
              <Filter className="w-4 h-4 mr-1.5" /> Filter
            </button>
            <button type="button" onClick={clearFilters} className="h-10 px-3 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors border border-border">
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Data Table */}
      <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex flex-col min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Invoice No</th>
                <th className="px-6 py-4 font-semibold">Cashier</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Payment</th>
                <th className="px-6 py-4 text-right font-semibold">Amount</th>
                <th className="px-6 py-4 text-center font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">Loading bills...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">No bills found matching criteria.</td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground/60" />
                        <div>
                          <div className="font-semibold">{new Date(s.created_at).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-primary">{s.invoice_number}</td>
                    <td className="px-6 py-4 font-medium">{s.cashier_name || 'System'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{s.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold border border-slate-200">
                        {s.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-foreground">
                      Rs. {parseFloat(s.total_amount as any).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handlePreviewReceipt(s.id)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100">
                        <FileText className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {previewData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-border bg-muted/20">
              <h3 className="font-bold">Receipt Preview</h3>
              <button onClick={() => setPreviewData(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-8 flex justify-center custom-scrollbar bg-slate-100" style={{ minWidth: 400 }}>
              <div className="bg-white shadow-sm p-4 w-[80mm] shrink-0" style={{ minHeight: '100mm' }}>
                <Receipt80mm 
                  invoiceNumber={previewData.invoice_number}
                  cashierName={previewData.cashier_name || 'System'}
                  date={new Date(previewData.created_at).toLocaleString()}
                  items={previewData.items.map((i: any) => ({
                    name: i.product_name,
                    quantity: i.quantity,
                    unit_price: parseFloat(i.unit_price),
                    subtotal: parseFloat(i.subtotal)
                  }))}
                  subtotal={parseFloat(previewData.subtotal)}
                  discount={parseFloat(previewData.discount)}
                  tax={parseFloat(previewData.tax)}
                  total={parseFloat(previewData.total_amount)}
                  amountPaid={parseFloat(previewData.amount_paid)}
                  paymentMethod={previewData.payment_method}
                  companyName={settingsMap.company_name}
                  companyAddress={settingsMap.company_address}
                  footerMessage={settingsMap.receipt_footer}
                  currencySymbol={settingsMap.currency_symbol}
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-border flex justify-end gap-3 bg-muted/20">
              <button onClick={() => setPreviewData(null)} className="px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors bg-white border border-border">
                Close
              </button>
              <button onClick={handlePrintPreview} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2">
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;

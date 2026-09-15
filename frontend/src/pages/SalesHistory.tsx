import { useState, useEffect } from 'react';
import { useDialogStore } from '../store/dialogStore';
import { Filter, Download, FileText, X, Printer, ChevronRight, Search } from 'lucide-react';
import api from '../api/axios';
import { renderToString } from 'react-dom/server';
import { Receipt80mm } from '../components/pos/Receipt';

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

const PAYMENT_COLORS: Record<string, string> = {
  Cash:   'bg-green-100 text-green-700 border-green-200',
  Card:   'bg-blue-100 text-blue-700 border-blue-200',
  Credit: 'bg-amber-100 text-amber-700 border-amber-200',
};

const SalesHistory = () => {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [settingsMap, setSettingsMap] = useState<any>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate]     = useState(new Date().toISOString().split('T')[0]);
  const [cashierId, setCashierId] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [search, setSearch]       = useState('');

  const [users, setUsers] = useState<{ id: number; full_name: string }[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  const fetchFiltersData = async () => {
    try {
      const [uRes, sRes] = await Promise.all([api.get('/users'), api.get('/shifts/current')]);
      setUsers(uRes.data);
      if (sRes.data) setOpeningBalance(parseFloat(sRes.data.opening_balance) || 0);
    } catch { /* silent */ }
  };

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate)  params.append('start_date', startDate);
      if (endDate)    params.append('end_date', endDate);
      if (cashierId)  params.append('cashier_id', cashierId);
      if (minAmount)  params.append('min_amount', minAmount);
      if (maxAmount)  params.append('max_amount', maxAmount);
      const res = await api.get(`/sales?${params.toString()}`);
      setSales(res.data);
    } catch {
      useDialogStore.getState().alert('Error', 'Failed to fetch sales history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiltersData(); fetchSales(); }, []);

  const handleFilterSubmit = (e: React.FormEvent) => { e.preventDefault(); fetchSales(); };

  const clearFilters = () => {
    setStartDate(''); setEndDate(''); setCashierId('');
    setMinAmount(''); setMaxAmount(''); setSearch('');
    setTimeout(fetchSales, 0);
  };

  const handlePreviewReceipt = async (saleId: number) => {
    if (selectedId === saleId) { setPreviewData(null); setSelectedId(null); return; }
    try {
      setPreviewLoading(true);
      setSelectedId(saleId);
      const [sRes, stRes] = await Promise.all([api.get(`/sales/${saleId}`), api.get('/settings')]);
      setSettingsMap(stRes.data);
      setPreviewData(sRes.data);
    } catch {
      useDialogStore.getState().alert('Error', 'Failed to load receipt');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!previewData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = renderToString(
      <Receipt80mm
        invoiceNumber={previewData.invoice_number}
        cashierName={previewData.cashier_name || 'System'}
        date={new Date(previewData.created_at).toLocaleString()}
        items={previewData.items.map((i: any) => ({
          name: i.product_name, quantity: i.quantity,
          unit_price: parseFloat(i.unit_price), subtotal: parseFloat(i.subtotal),
        }))}
        subtotal={parseFloat(previewData.subtotal)}
        discount={parseFloat(previewData.discount)}
        tax={parseFloat(previewData.tax)}
        total={parseFloat(previewData.total_amount)}
        amountPaid={parseFloat(previewData.amount_paid)}
        paymentMethod={previewData.payment_method}
        companyName={settingsMap.company_name}
        companyAddress={settingsMap.company_address}
        companyPhone={settingsMap.company_phone}
        customerName={previewData.customer_name || 'Walk-in'}
        footerMessage={settingsMap.receipt_footer}
        currencySymbol={settingsMap.currency_symbol}
        companyLogo={settingsMap.company_logo}
      />
    );
    printWindow.document.write(`<html><head><title>Receipt ${previewData.invoice_number}</title>
      <style>body{margin:0;padding:0;font-family:monospace;}
      .flex{display:flex;}.justify-between{justify-content:space-between;}
      .text-center{text-align:center;}.text-right{text-align:right;}
      .font-bold{font-weight:bold;}.font-extrabold{font-weight:900;}
      .w-1\\/2{width:50%;}.w-1\\/6{width:16.666%;}.w-1\\/3{width:33.333%;}
      .border-b{border-bottom:1px dashed #000;}.border-t{border-top:1px solid #000;}
      .mb-1{margin-bottom:4px;}.mb-2{margin-bottom:8px;}.mb-4{margin-bottom:16px;}
      .mt-2{margin-top:8px;}.mt-4{margin-top:16px;}.mt-6{margin-top:24px;}
      .pb-1{padding-bottom:4px;}.pb-2{padding-bottom:8px;}.pt-2{padding-top:8px;}
      .py-1{padding-top:4px;padding-bottom:4px;}.p-4{padding:16px;}
      .space-y-1>*+*{margin-top:4px;}
      .text-xl{font-size:18px;}.text-2xl{font-size:22px;}
      .border-t-2{border-top:2px solid #000;}.border-dashed{border-style:dashed;}
      .pr-2{padding-right:8px;}.text-xs{font-size:11px;}
      </style></head><body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  // Summaries
  const filteredSales = search
    ? sales.filter(s =>
        s.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        (s.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.cashier_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : sales;

  const totalCash   = filteredSales.filter(s => s.payment_method === 'Cash').reduce((a, s) => a + parseFloat(s.total_amount as any), 0);
  const totalCard   = filteredSales.filter(s => s.payment_method === 'Card').reduce((a, s) => a + parseFloat(s.total_amount as any), 0);
  const totalCredit = filteredSales.filter(s => s.payment_method === 'Credit').reduce((a, s) => a + parseFloat(s.total_amount as any), 0);
  const totalAll    = filteredSales.reduce((a, s) => a + parseFloat(s.total_amount as any), 0);
  const closingBalance = openingBalance + totalCash;
  const sym = settingsMap.currency_symbol || 'Rs.';

  const handlePrintReport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const company = settingsMap.company_name || 'Company';
    const dateRange = startDate === endDate ? startDate : `${startDate} to ${endDate}`;
    w.document.write(`<html><head><title>Sales Report</title>
    <style>
      body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#000;}
      h1{margin:0 0 4px;font-size:22px;} p{margin:2px 0;font-size:13px;}
      .divider{border:none;border-top:2px solid #000;margin:12px 0;}
      .divider-light{border:none;border-top:1px dashed #aaa;margin:8px 0;}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px;}
      th{border-bottom:2px solid #000;padding:6px 8px;text-align:left;background:#f5f5f5;}
      td{border-bottom:1px solid #ddd;padding:5px 8px;}
      .right{text-align:right;} .bold{font-weight:bold;}
      .summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;}
      .summary-card{border:1px solid #ddd;border-radius:6px;padding:10px 14px;}
      .summary-label{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.05em;}
      .summary-value{font-size:18px;font-weight:bold;margin-top:2px;}
      .summary-value.green{color:#16a34a;} .summary-value.blue{color:#2563eb;}
      .summary-value.amber{color:#d97706;} .footer{text-align:center;margin-top:24px;font-size:11px;color:#999;}
      @media print{@page{margin:15mm;}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1>${company}</h1>
        <p style="font-size:15px;font-weight:bold;">Sales Summary Report</p>
        <p>${dateRange}</p>
        ${cashierId ? `<p>Cashier: ${users.find(u => u.id === parseInt(cashierId))?.full_name || ''}</p>` : ''}
      </div>
      <div style="text-align:right;font-size:12px;color:#666;">Printed: ${new Date().toLocaleString()}</div>
    </div>
    <hr class="divider"/>
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Opening Balance</div>
        <div class="summary-value">${sym} ${openingBalance.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Closing Balance (Cash)</div>
        <div class="summary-value green">${sym} ${closingBalance.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Cash Sales</div>
        <div class="summary-value green">${sym} ${totalCash.toFixed(2)}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Total Card Sales</div>
        <div class="summary-value blue">${sym} ${totalCard.toFixed(2)}</div>
      </div>
      ${totalCredit > 0 ? `<div class="summary-card">
        <div class="summary-label">Total Credit</div>
        <div class="summary-value amber">${sym} ${totalCredit.toFixed(2)}</div>
      </div>` : ''}
      <div class="summary-card" style="grid-column:${totalCredit > 0 ? '2' : '1'}/3;">
        <div class="summary-label">Grand Total</div>
        <div class="summary-value" style="font-size:22px;">${sym} ${totalAll.toFixed(2)}</div>
      </div>
    </div>
    <table style="margin-top:20px;">
      <thead><tr>
        <th>Date & Time</th><th>Invoice</th><th>Cashier</th><th>Customer</th><th>Payment</th><th class="right">Amount</th>
      </tr></thead>
      <tbody>
        ${filteredSales.map(s => `<tr>
          <td>${new Date(s.created_at).toLocaleString()}</td>
          <td class="bold">${s.invoice_number}</td>
          <td>${s.cashier_name || 'System'}</td>
          <td>${s.customer_name || 'Walk-in'}</td>
          <td>${s.payment_method}</td>
          <td class="right bold">${sym} ${parseFloat(s.total_amount as any).toFixed(2)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr style="border-top:2px solid #000;">
          <td colspan="5" class="bold right">TOTAL (${filteredSales.length} bills)</td>
          <td class="right bold" style="font-size:14px;">${sym} ${totalAll.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <div class="footer">— End of Report —</div>
    </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Top Filter Bar ── */}
      <div className="bg-white border-b border-border px-5 py-4 shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          {/* Date range */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cashier</label>
            <select value={cashierId} onChange={e => setCashierId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white">
              <option value="">All</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Min</label>
            <input type="number" placeholder="0" value={minAmount} onChange={e => setMinAmount(e.target.value)}
              className="h-9 w-24 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Max</label>
            <input type="number" placeholder="∞" value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
              className="h-9 w-24 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <button onClick={handleFilterSubmit as any}
            className="h-9 px-5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
          <button onClick={clearFilters}
            className="h-9 px-4 bg-slate-100 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors border border-slate-200">
            Clear
          </button>

          {/* Right-side actions */}
          <div className="ml-auto flex items-end gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search invoice / customer..."
                className="h-9 pl-8 pr-3 w-52 rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-white" />
            </div>
            <button onClick={() => handleExportExcel()}
              className="h-9 px-3 bg-emerald-50 text-emerald-700 rounded-lg font-semibold text-sm hover:bg-emerald-100 transition-colors border border-emerald-200 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={handlePrintReport}
              className="h-9 px-3 bg-slate-800 text-white rounded-lg font-semibold text-sm hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-sm">
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary Pills ── */}
      <div className="flex gap-3 px-5 py-3 shrink-0">
        <div className="bg-white border border-green-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
          <div className="w-2 h-8 bg-green-500 rounded-full"></div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cash</div>
            <div className="font-bold text-green-700 text-sm">{sym} {totalCash.toFixed(2)}</div>
          </div>
        </div>
        <div className="bg-white border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
          <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Card</div>
            <div className="font-bold text-blue-700 text-sm">{sym} {totalCard.toFixed(2)}</div>
          </div>
        </div>
        {totalCredit > 0 && (
          <div className="bg-white border border-amber-100 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
            <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Credit</div>
              <div className="font-bold text-amber-700 text-sm">{sym} {totalCredit.toFixed(2)}</div>
            </div>
          </div>
        )}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm ml-auto">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bills Found</div>
            <div className="font-bold text-slate-800 text-sm">{filteredSales.length}</div>
          </div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 flex items-center gap-3 shadow-sm">
          <div>
            <div className="text-[10px] font-bold text-primary/70 uppercase tracking-wider">Grand Total</div>
            <div className="font-black text-primary text-lg leading-none mt-0.5">{sym} {totalAll.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Main content: Table + Side Preview ── */}
      <div className="flex flex-1 min-h-0 gap-0">

        {/* Table */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] uppercase bg-white text-slate-500 sticky top-0 z-10 border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-bold">Date & Time</th>
                  <th className="px-5 py-3 font-bold">Invoice</th>
                  <th className="px-5 py-3 font-bold">Cashier</th>
                  <th className="px-5 py-3 font-bold">Customer</th>
                  <th className="px-5 py-3 font-bold">Method</th>
                  <th className="px-5 py-3 font-bold text-right">Amount</th>
                  <th className="px-5 py-3 font-bold text-center w-12">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Loading bills...</span>
                    </div>
                  </td></tr>
                ) : filteredSales.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16 text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No bills found matching criteria.</p>
                  </td></tr>
                ) : (
                  filteredSales.map((s) => (
                    <tr key={s.id}
                      onClick={() => handlePreviewReceipt(s.id)}
                      className={`border-b border-slate-100 hover:bg-primary/5 transition-colors cursor-pointer ${selectedId === s.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-800 text-xs">{new Date(s.created_at).toLocaleDateString()}</div>
                        <div className="text-[11px] text-slate-400">{new Date(s.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-5 py-3 font-mono font-bold text-primary text-xs">{s.invoice_number}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">{s.cashier_name || 'System'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{s.customer_name || 'Walk-in'}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PAYMENT_COLORS[s.payment_method] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {s.payment_method}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800 text-sm">{sym} {parseFloat(s.total_amount as any).toFixed(2)}</td>
                      <td className="px-5 py-3 text-center">
                        <ChevronRight className={`w-4 h-4 mx-auto transition-all ${selectedId === s.id ? 'text-primary rotate-90' : 'text-slate-300'}`} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Receipt Preview Panel */}
        <div className={`shrink-0 border-l border-border bg-white flex flex-col transition-all duration-300 ${previewData || previewLoading ? 'w-80' : 'w-0 overflow-hidden'}`}>
          {/* Panel header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-border shrink-0 bg-slate-50">
            <span className="text-sm font-bold text-slate-700">Receipt Preview</span>
            <div className="flex items-center gap-2">
              {previewData && (
                <button onClick={handlePrintReceipt}
                  className="flex items-center gap-1 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
              )}
              <button onClick={() => { setPreviewData(null); setSelectedId(null); }}
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto bg-slate-100 flex flex-col items-center py-4 px-2 gap-4">
            {previewLoading ? (
              <div className="flex flex-col items-center gap-3 mt-10">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400">Loading receipt...</span>
              </div>
            ) : previewData ? (
              <>
                {/* Bill info strip */}
                <div className="w-full bg-white rounded-xl p-3 border border-border text-xs space-y-1.5 shadow-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Invoice</span>
                    <span className="font-bold text-primary font-mono">{previewData.invoice_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-semibold">{new Date(previewData.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cashier</span>
                    <span className="font-semibold">{previewData.cashier_name || 'System'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total</span>
                    <span className="font-black text-base text-primary">{sym} {parseFloat(previewData.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                {/* The receipt itself */}
                <div className="bg-white shadow-md border border-slate-200 rounded overflow-hidden" style={{ width: '80mm' }}>
                  <Receipt80mm
                    invoiceNumber={previewData.invoice_number}
                    cashierName={previewData.cashier_name || 'System'}
                    date={new Date(previewData.created_at).toLocaleString()}
                    items={previewData.items.map((i: any) => ({
                      name: i.product_name, quantity: i.quantity,
                      unit_price: parseFloat(i.unit_price), subtotal: parseFloat(i.subtotal),
                    }))}
                    subtotal={parseFloat(previewData.subtotal)}
                    discount={parseFloat(previewData.discount)}
                    tax={parseFloat(previewData.tax)}
                    total={parseFloat(previewData.total_amount)}
                    amountPaid={parseFloat(previewData.amount_paid)}
                    paymentMethod={previewData.payment_method}
                    companyName={settingsMap.company_name}
                    companyAddress={settingsMap.company_address}
                    companyPhone={settingsMap.company_phone}
                    customerName={previewData.customer_name || 'Walk-in'}
                    footerMessage={settingsMap.receipt_footer}
                    currencySymbol={settingsMap.currency_symbol}
                    companyLogo={settingsMap.company_logo}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  function handleExportExcel() {
    if (sales.length === 0) { useDialogStore.getState().alert('Export Error', 'No data to export.'); return; }
    const headers = ['Date', 'Invoice No', 'Cashier', 'Customer', 'Payment Method', 'Amount'];
    const csvRows = [headers.join(',')];
    filteredSales.forEach(s => {
      csvRows.push(`"${new Date(s.created_at).toLocaleString()}","${s.invoice_number}","${s.cashier_name || 'System'}","${s.customer_name || 'Walk-in'}","${s.payment_method}","${parseFloat(s.total_amount as any).toFixed(2)}"`);
    });
    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvRows.join('\n'));
    link.download = `sales_history_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export default SalesHistory;

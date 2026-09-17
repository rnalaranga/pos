import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { BarChart3, TrendingUp, Package, Users, Printer, FileText } from 'lucide-react';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [shiftSummary, setShiftSummary] = useState<any>(null);
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [advancedReports, setAdvancedReports] = useState<any>(null);
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('shift'); // 'shift', 'products', 'invoices', 'advanced', 'daily'
  const { currencySymbol } = useSettingsStore();
  
  // Invoice Filters
  const [invoiceStartDate, setInvoiceStartDate] = useState('');
  const [invoiceEndDate, setInvoiceEndDate] = useState('');
  const [invoicePaymentMethod, setInvoicePaymentMethod] = useState('');

  const fetchShiftSummary = async (date: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/shift?date=${date}`);
      setShiftSummary(res.data);
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      const res = await api.get('/reports/fast-moving');
      setTopProducts(res.data);
    } catch (error) {
      console.error("Failed to load top products");
    }
  };

  const fetchSales = async () => {
    try {
      const res = await api.get('/sales');
      setSales(res.data);
    } catch (error) {
      console.error("Failed to load sales");
    }
  };

  const fetchAdvancedReports = async () => {
    try {
      const res = await api.get('/reports/advanced');
      setAdvancedReports(res.data);
    } catch (error) {
      console.error("Failed to load advanced reports");
    }
  };

  const fetchDailySales = async () => {
    try {
      const res = await api.get('/reports/daily-sales');
      setDailySales(res.data);
    } catch (error) {
      console.error("Failed to load daily sales");
    }
  };

  useEffect(() => {
    fetchShiftSummary(reportDate);
    fetchTopProducts();
    fetchSales();
    fetchAdvancedReports();
    fetchDailySales();
  }, [reportDate]);

  const filteredSales = sales.filter(s => {
    let matchesDate = true;
    if (invoiceStartDate || invoiceEndDate) {
      const saleDate = new Date(s.created_at).setHours(0,0,0,0);
      if (invoiceStartDate && saleDate < new Date(invoiceStartDate).setHours(0,0,0,0)) matchesDate = false;
      if (invoiceEndDate && saleDate > new Date(invoiceEndDate).setHours(0,0,0,0)) matchesDate = false;
    }
    
    const matchesMethod = invoicePaymentMethod ? s.payment_method === invoicePaymentMethod : true;
    return matchesDate && matchesMethod;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground">Date:</label>
          <input 
            type="date" 
            value={reportDate} 
            onChange={(e) => setReportDate(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
          />
          <button onClick={handlePrint} className="flex items-center bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted-foreground hover:text-background transition-colors h-9 text-sm font-medium ml-2">
            <Printer className="h-4 w-4 mr-2" /> Print
          </button>
        </div>
      </div>

      <div className="flex space-x-1 bg-muted/30 p-1 rounded-lg border w-max">
        <button 
          onClick={() => setActiveTab('shift')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'shift' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Shift Summary
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'products' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Fast Moving Items
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'invoices' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Sales History
        </button>
        <button 
          onClick={() => setActiveTab('advanced')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'advanced' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Advanced Reports (ERP)
        </button>
        <button 
          onClick={() => setActiveTab('daily')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'daily' ? 'bg-background shadow-sm border text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Daily Cash Balances
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading reports...</div>
      ) : activeTab === 'shift' && shiftSummary ? (
        <div className="space-y-6 printable-report">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Total Sales</h3>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{currencySymbol}{Number(shiftSummary.total_sales).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">From {shiftSummary.total_invoices} invoices</p>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Cash Received</h3>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{currencySymbol}{Number(shiftSummary.cash_received).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Card/Digital</h3>
                <Printer className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{currencySymbol}{Number(shiftSummary.card_received).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium">Credit Sales (Unpaid)</h3>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{currencySymbol}{Number(shiftSummary.credit_sales).toFixed(2)}</div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="font-semibold mb-4 border-b pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Taxes</span>
                  <span className="font-medium">{currencySymbol}{Number(shiftSummary.total_tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Total Discounts Given</span>
                  <span className="font-medium text-destructive">{currencySymbol}{Number(shiftSummary.total_discounts).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Loyalty Points Earned</span>
                  <span className="font-medium text-green-600">+{Number(shiftSummary.total_loyalty_earned)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Loyalty Points Redeemed</span>
                  <span className="font-medium text-destructive">-{Number(shiftSummary.total_loyalty_used)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'products' ? (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden printable-report">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Top Selling Products
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase">
                <tr>
                  <th className="px-6 py-3 font-medium">Rank</th>
                  <th className="px-6 py-3 font-medium">Product Name</th>
                  <th className="px-6 py-3 font-medium text-right">Quantity Sold</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-3 text-muted-foreground font-medium">#{idx + 1}</td>
                    <td className="px-6 py-3 font-medium">{p.name}</td>
                    <td className="px-6 py-3 text-right font-bold text-primary">{p.sold_qty}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-8 text-muted-foreground">No sales data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'invoices' ? (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <input 
                type="date" value={invoiceStartDate} onChange={e => setInvoiceStartDate(e.target.value)} 
                className="h-9 w-full sm:w-36 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" title="From Date"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input 
                type="date" value={invoiceEndDate} onChange={e => setInvoiceEndDate(e.target.value)} 
                className="h-9 w-full sm:w-36 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary" title="To Date"
              />
            </div>
            <select 
              value={invoicePaymentMethod} onChange={e => setInvoicePaymentMethod(e.target.value)}
              className="h-9 w-full sm:w-48 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Payment Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Credit">Credit</option>
            </select>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Invoice No</th>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Cashier</th>
                    <th className="px-6 py-4 font-medium text-center">Payment</th>
                    <th className="px-6 py-4 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No invoices found.</td></tr>
                  ) : (
                    filteredSales.map((s) => (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-muted-foreground">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 font-medium text-primary">{s.invoice_number}</td>
                        <td className="px-6 py-4">{s.customer_name || 'Walk-in Customer'}</td>
                        <td className="px-6 py-4">{s.cashier_name}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-xs ${s.payment_method === 'Cash' ? 'bg-green-100 text-green-800' : s.payment_method === 'Card' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                            {s.payment_method}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">{currencySymbol}{Number(s.total_amount).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'advanced' && advancedReports ? (
        <div className="space-y-6 animate-in fade-in printable-report">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground pb-2">Gross Revenue</h3>
              <div className="text-2xl font-bold">{currencySymbol}{Number(advancedReports.profitAndLoss.revenue).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
              <h3 className="tracking-tight text-sm font-medium text-muted-foreground pb-2">Cost of Goods Sold</h3>
              <div className="text-2xl font-bold text-destructive">{currencySymbol}{Number(advancedReports.profitAndLoss.cogs).toFixed(2)}</div>
            </div>
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 bg-primary/5">
              <h3 className="tracking-tight text-sm font-medium text-primary pb-2">Gross Profit (P&L)</h3>
              <div className="text-2xl font-bold text-primary">{currencySymbol}{Number(advancedReports.profitAndLoss.grossProfit).toFixed(2)}</div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold flex items-center gap-2"><Package className="h-4 w-4" /> Inventory Valuation</h3>
                <p className="text-xs text-muted-foreground">Current value of stock on hand</p>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-center">Items in Stock</th>
                    <th className="px-4 py-3 font-medium text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.inventoryValuation.length === 0 && <tr><td colSpan={3} className="text-center py-4">No inventory</td></tr>}
                  {advancedReports.inventoryValuation.map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.category || 'Uncategorized'}</td>
                      <td className="px-4 py-3 text-center">{row.total_items}</td>
                      <td className="px-4 py-3 text-right font-semibold">{currencySymbol}{Number(row.total_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Sales by Category</h3>
                <p className="text-xs text-muted-foreground">Revenue breakdown by product category</p>
              </div>
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {advancedReports.salesByCategory.length === 0 && <tr><td colSpan={2} className="text-center py-4">No sales data</td></tr>}
                  {advancedReports.salesByCategory.map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{row.category || 'Uncategorized'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">{currencySymbol}{Number(row.revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'daily' ? (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden printable-report">
          <div className="p-4 border-b bg-muted/30 flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Daily Cash & Sales Balances
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-center">Invoices</th>
                  <th className="px-6 py-4 font-medium text-right">Cash Sales</th>
                  <th className="px-6 py-4 font-medium text-right">Card Sales</th>
                  <th className="px-6 py-4 font-medium text-right text-orange-600">Credit Sales</th>
                  <th className="px-6 py-4 font-medium text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {dailySales.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No daily sales found.</td></tr>
                ) : (
                  dailySales.map((row: any, i: number) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-6 py-4 font-medium">{new Date(row.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">{row.total_invoices}</td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">{currencySymbol}{Number(row.cash_sales).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-blue-600">{currencySymbol}{Number(row.card_sales).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-orange-600">{currencySymbol}{Number(row.credit_sales).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary">{currencySymbol}{Number(row.total_sales).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .printable-report, .printable-report * { visibility: visible; }
          .printable-report { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .border { border-color: #ddd !important; }
        }
      `}} />
    </div>
  );
};

export default Reports;

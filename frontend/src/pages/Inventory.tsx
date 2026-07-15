import { useDialogStore } from '../store/dialogStore';
import { useState, useEffect } from 'react';
import { Search, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const Inventory = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // all, low, out
  const [activeTab, setActiveTab] = useState<'status' | 'ledger'>('status');
  const { currencySymbol } = useSettingsStore();

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [transferData, setTransferData] = useState({
    from_warehouse_id: '', to_warehouse_id: '', quantity: 1, reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const whRes = await api.get('/warehouses');
      setWarehouses(whRes.data);
      
      const activeWh = selectedWarehouse || (whRes.data.length > 0 ? whRes.data.find((w:any) => w.is_default)?.id || whRes.data[0].id : '');
      if (!selectedWarehouse) setSelectedWarehouse(activeWh);

      const [stockRes, ledgerRes, catRes] = await Promise.all([
        api.get(`/warehouses/stock?warehouse_id=${activeWh}`),
        api.get(`/warehouses/ledger?warehouse_id=${activeWh}`),
        api.get('/categories')
      ]);
      
      setProducts(stockRes.data);
      setLedger(ledgerRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedWarehouse, activeTab]);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (transferData.from_warehouse_id === transferData.to_warehouse_id) {
        useDialogStore.getState().alert('Error', 'Source and destination warehouse must be different');
        return;
      }
      
      await api.post('/inventory/transfer', {
        product_id: selectedProduct.product_id,
        ...transferData
      });
      
      setIsTransferModalOpen(false);
      fetchData();
      useDialogStore.getState().alert('Success', 'Stock transferred successfully');
    } catch (error: any) {
      useDialogStore.getState().alert('Error', error.response?.data?.message || 'Failed to transfer stock');
    }
  };

  const handleTransfer = (prod: any) => {
    setSelectedProduct(prod);
    setTransferData({
      from_warehouse_id: prod.warehouse_id,
      to_warehouse_id: '',
      quantity: 1,
      reason: ''
    });
    setIsTransferModalOpen(true);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(search)) ||
                          (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    
    const matchesCategory = selectedCategory ? String(p.category) === String(selectedCategory) : true;
    
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock > 0 && p.stock <= p.reorder_level;
    if (stockFilter === 'out') matchesStock = p.stock <= 0;
    
    return matchesSearch && matchesCategory && matchesStock;
  });
  
  const filteredLedger = ledger.filter(l => l.product?.toLowerCase().includes(search.toLowerCase()));

  const totalValue = products.reduce((acc, p) => acc + (p.stock * p.purchase_price), 0);
  const lowStockCount = products.filter(p => p.stock <= p.reorder_level).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Management</h1>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" placeholder="Search products..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-48 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select 
            value={selectedWarehouse} 
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full sm:w-48 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {activeTab === 'status' && (
            <select 
              value={stockFilter} 
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full sm:w-48 h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Warehouse Value</div>
          <div className="text-2xl font-bold">{currencySymbol}{totalValue.toFixed(2)}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-sm font-medium text-muted-foreground mb-1">Total Items in Warehouse</div>
          <div className="text-2xl font-bold">{products.length}</div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm border-destructive/50 bg-destructive/5">
          <div className="text-sm font-medium text-destructive mb-1 flex items-center"><AlertTriangle className="h-4 w-4 mr-1" /> Low Stock Items</div>
          <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
        </div>
      </div>

      <div className="flex gap-4 border-b border-border mb-4">
        <button onClick={() => setActiveTab('status')} className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'status' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Stock Status
        </button>
        <button onClick={() => setActiveTab('ledger')} className={`pb-2 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'ledger' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Stock Ledger (History)
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              {activeTab === 'status' ? (
                <tr>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium text-center">Stock</th>
                  <th className="px-6 py-4 font-medium text-center">Reorder Level</th>
                  <th className="px-6 py-4 font-medium text-right">Value</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Product</th>
                  <th className="px-6 py-4 font-medium">Transaction Type</th>
                  <th className="px-6 py-4 font-medium text-center">Qty In</th>
                  <th className="px-6 py-4 font-medium text-center">Qty Out</th>
                  <th className="px-6 py-4 font-medium text-center">Balance</th>
                  <th className="px-6 py-4 font-medium">Reference</th>
                  <th className="px-6 py-4 font-medium text-right">User</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8">Loading...</td></tr>
              ) : activeTab === 'status' ? (
                filteredProducts.map((p) => (
                  <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${p.stock <= p.reorder_level ? 'bg-destructive/5' : ''}`}>
                    <td className="px-6 py-4 font-medium">{p.name} <span className="text-xs text-muted-foreground font-normal ml-2">{p.sku}</span></td>
                    <td className="px-6 py-4 text-center font-medium">
                      <span className={p.stock <= p.reorder_level ? 'text-destructive' : 'text-green-600'}>{p.stock}</span>
                    </td>
                    <td className="px-6 py-4 text-center">{p.reorder_level}</td>
                    <td className="px-6 py-4 text-right">{currencySymbol}{(p.stock * p.purchase_price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleTransfer(p)} className="flex items-center justify-end text-blue-500 hover:text-blue-700 w-full">
                        <ArrowRightLeft className="h-4 w-4 mr-1" /> Transfer
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                filteredLedger.map((l) => (
                  <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 font-medium">{l.product}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs bg-muted/50 border font-medium">
                        {l.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-medium text-green-600">{l.qty_in > 0 ? `+${l.qty_in}` : '-'}</td>
                    <td className="px-6 py-4 text-center font-medium text-destructive">{l.qty_out > 0 ? `-${l.qty_out}` : '-'}</td>
                    <td className="px-6 py-4 text-center font-bold">{l.current_balance}</td>
                    <td className="px-6 py-4 text-muted-foreground">{l.reference_id || '-'}</td>
                    <td className="px-6 py-4 text-right text-muted-foreground">{l.user || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isTransferModalOpen && selectedProduct && (
        <div className="absolute inset-0 rounded-b-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-md">
            <h2 className="text-xl font-bold mb-2">Transfer Stock</h2>
            <p className="text-muted-foreground text-sm mb-6">Product: <span className="font-medium text-foreground">{selectedProduct.name}</span></p>
            
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">From Warehouse</label>
                <select disabled value={transferData.from_warehouse_id} className="w-full h-10 px-3 rounded-md border border-input bg-muted text-muted-foreground">
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">To Warehouse</label>
                <select required value={transferData.to_warehouse_id} onChange={(e) => setTransferData({...transferData, to_warehouse_id: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary">
                  <option value="">Select Destination Warehouse</option>
                  {warehouses.filter(w => w.id !== selectedProduct.warehouse_id).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Quantity (Max: {selectedProduct.stock})</label>
                <input type="number" min="1" max={selectedProduct.stock} value={transferData.quantity} onChange={(e) => setTransferData({...transferData, quantity: parseInt(e.target.value) || 1})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Reason / Notes (Optional)</label>
                <textarea value={transferData.reason} onChange={(e) => setTransferData({...transferData, reason: e.target.value})} className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary min-h-[80px]" />
              </div>
              
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 h-12 bg-muted text-muted-foreground rounded-md hover:bg-muted-foreground hover:text-background transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;

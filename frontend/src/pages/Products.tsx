import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import api from '../api/axios';

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { currencySymbol } = useSettingsStore();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
    purchase_price: 0, selling_price: 0, wholesale_price: 0,
    stock: 0, reorder_level: 5, unit: 'pcs', is_service: false, status: 'Active'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
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
      const payload = { ...formData, category_id: formData.category_id || null };
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = (prod: any) => {
    setFormData({
      name: prod.name,
      barcode: prod.barcode || '',
      sku: prod.sku || '',
      category_id: prod.category_id || '',
      supplier_id: prod.supplier_id || '',
      purchase_price: prod.purchase_price,
      selling_price: prod.selling_price,
      wholesale_price: prod.wholesale_price,
      stock: prod.stock,
      reorder_level: prod.reorder_level,
      unit: prod.unit,
      is_service: prod.is_service === 1 || prod.is_service === true,
      status: prod.status || 'Active'
    });
    setEditingId(prod.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await useDialogStore.getState().confirm('Confirm', 'Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to delete product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
      purchase_price: 0, selling_price: 0, wholesale_price: 0,
      stock: 0, reorder_level: 5, unit: 'pcs', is_service: false, status: 'Active'
    });
    setEditingId(null);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    (p.barcode && p.barcode.includes(search)) ||
    (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Products Management</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Product Details</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Pricing</th>
                <th className="px-6 py-4 font-medium text-center">Stock</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No products found.</td></tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-base">{prod.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {prod.barcode && `BC: ${prod.barcode} | `} SKU: {prod.sku || 'N/A'}
                        {prod.is_service ? ' | Service' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {prod.category_name ? (
                        <span className="bg-muted px-2 py-1 rounded-md text-xs">{prod.category_name}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Uncategorized</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">Sell: <span className="font-medium text-primary">{currencySymbol}{Number(prod.selling_price).toFixed(2)}</span></div>
                      <div className="text-xs text-muted-foreground mt-1">Cost: {currencySymbol}{Number(prod.purchase_price).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {prod.is_service ? (
                        <span className="text-muted-foreground text-xs">-</span>
                      ) : (
                        <div>
                          <div className={`font-medium ${prod.stock <= prod.reorder_level ? 'text-destructive' : 'text-green-600'}`}>
                            {prod.stock} {prod.unit}
                          </div>
                          {prod.stock <= prod.reorder_level && (
                            <div className="text-[10px] text-destructive uppercase tracking-wider mt-1">Low Stock</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(prod)} className="text-blue-500 hover:text-blue-700 mr-3 p-1">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(prod.id)} className="text-destructive hover:text-destructive/80 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 rounded-b-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h2 className="text-xl font-bold mb-6">{editingId ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input 
                    type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Barcode</label>
                  <input 
                    type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input 
                    type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select 
                    value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Unit</label>
                  <input 
                    type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    placeholder="pcs, kg, box"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Purchase Price</label>
                  <input 
                    type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Selling Price *</label>
                  <input 
                    type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary" required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Wholesale Price</label>
                  <input 
                    type="number" step="0.01" value={formData.wholesale_price} onChange={(e) => setFormData({...formData, wholesale_price: parseFloat(e.target.value) || 0})}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium mb-1">Current Stock</label>
                  <input 
                    type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                    disabled={formData.is_service}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" required={!formData.is_service}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reorder Level</label>
                  <input 
                    type="number" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})}
                    disabled={formData.is_service}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center h-10 mb-1">
                  <input 
                    type="checkbox" id="is_service"
                    checked={formData.is_service} onChange={(e) => setFormData({...formData, is_service: e.target.checked})}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_service" className="ml-2 block text-sm font-medium">This is a Service (No Stock)</label>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 bg-muted text-muted-foreground rounded-md font-medium hover:bg-muted-foreground hover:text-background transition-colors">Cancel</button>
                <button type="submit" className="flex-1 h-12 bg-primary text-primary-foreground rounded-md font-bold hover:bg-primary/90 transition-colors">{editingId ? 'Update Product' : 'Save Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

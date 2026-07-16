import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { useState, useEffect, Fragment } from 'react';
import { Plus, Edit, Trash2, Search, Download, Upload, FileUp } from 'lucide-react';
import api from '../api/axios';

const MaterialSearchSelect = ({ value, onChange, options }: { value: number, onChange: (val: number) => void, options: any[] }) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    (o.barcode && o.barcode.includes(search)) || 
    (o.sku && o.sku.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative flex-1">
      <div 
        className="h-9 px-2 rounded-md border border-input bg-background flex items-center cursor-text"
        onClick={() => setIsOpen(true)}
      >
        {isOpen ? (
          <input 
            autoFocus
            type="text" 
            className="w-full h-full bg-transparent focus:outline-none text-sm" 
            placeholder="Search material..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
        ) : (
          <div className="text-sm truncate w-full text-left" onClick={() => setIsOpen(true)}>
            {selectedOption ? `${selectedOption.name} (Stock: ${selectedOption.stock})` : <span className="text-muted-foreground">Select Material...</span>}
          </div>
        )}
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-border rounded-xl shadow-2xl z-[100] p-1 animate-in fade-in zoom-in-95 duration-200">
          {search.trim().length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center flex flex-col items-center gap-2">
              <Search className="w-6 h-6 opacity-30 mb-1" />
              <span>Start typing to find materials...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">No materials found for "{search}"</div>
          ) : (
            filteredOptions.map(o => (
              <div 
                key={o.id} 
                className="px-3 py-2.5 text-sm hover:bg-primary/10 hover:text-primary rounded-lg cursor-pointer flex justify-between items-center transition-colors mb-0.5 last:mb-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.id);
                  setIsOpen(false);
                }}
              >
                <div className="font-semibold">{o.name}</div>
                <div className="text-xs font-bold text-muted-foreground bg-slate-100 px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                  Stock: {o.stock}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Products = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { currencySymbol } = useSettingsStore();
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', barcode: '', sku: '', category_id: '', supplier_id: '',
    purchase_price: 0, selling_price: 0, wholesale_price: 0,
    stock: 0, reorder_level: 5, unit: 'pcs', is_service: false, status: 'Active',
    materials: [] as {material_id: number, quantity: number}[]
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

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/products/template/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      useDialogStore.getState().alert('Error', 'Failed to download template');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setIsImporting(true);
    const form = new FormData();
    form.append('file', importFile);
    try {
      const res = await api.post('/products/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      useDialogStore.getState().alert('Import Status', res.data.message + (res.data.errors?.length ? `\n\nErrors:\n${res.data.errors.join('\n')}` : ''));
      setIsImportModalOpen(false);
      setImportFile(null);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Error', error.response?.data?.message || 'Failed to import products');
    } finally {
      setIsImporting(false);
    }
  };

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
      status: prod.status || 'Active',
      materials: prod.materials || []
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
      stock: 0, reorder_level: 5, unit: 'pcs', is_service: false, status: 'Active', materials: []
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
          <div className="flex gap-2">
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-md hover:bg-slate-50 transition-colors h-9 text-sm font-medium shadow-sm"
            >
              <FileUp className="h-4 w-4 mr-2" /> Import
            </button>
            <button 
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Product
            </button>
          </div>
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
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[100] flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-card shadow-sm sticky top-0 z-10">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <p className="text-muted-foreground text-sm mt-1">{editingId ? 'Update product details and inventory' : 'Enter the details for the new product'}</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 bg-muted text-muted-foreground rounded-full font-semibold hover:bg-muted-foreground hover:text-background transition-colors">Cancel</button>
              <button onClick={(e) => { e.preventDefault(); handleSubmit(e as any); }} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-full font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg">
                {editingId ? 'Update Product' : 'Save Product'}
              </button>
            </div>
          </div>
          
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
            <div className="max-w-[1200px] mx-auto p-8 pt-12 pb-48">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Basic Info Card */}
                  <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-primary rounded-full"></div> Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Product Name *</label>
                        <input 
                          type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Barcode</label>
                        <input 
                          type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">SKU</label>
                        <input 
                          type="text" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Category</label>
                        <select 
                          value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        >
                          <option value="">Select Category</option>
                          {categories.filter(c => !c.parent_id).map(parentCat => (
                            <Fragment key={parentCat.id}>
                              <option value={parentCat.id} className="font-bold text-foreground">
                                {parentCat.name}
                              </option>
                              {categories.filter(c => c.parent_id === parentCat.id).map(subCat => (
                                <option key={subCat.id} value={subCat.id} className="text-muted-foreground">
                                  &nbsp;&nbsp;&nbsp;↳ {subCat.name}
                                </option>
                              ))}
                            </Fragment>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Unit</label>
                        <input 
                          type="text" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}
                          placeholder="pcs, kg, box"
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Consumed Materials Card */}
                  {formData.is_service && (
                    <div className="bg-white p-8 rounded-2xl border border-primary/20 shadow-sm shadow-primary/5 animate-in slide-in-from-top-4 fade-in duration-300 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-tr-2xl rounded-bl-[100px] -z-0"></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                          <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                              <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div> Consumed Materials (BOM)
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">Select materials that are automatically consumed when this service is sold.</p>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, materials: [...formData.materials, {material_id: 0, quantity: 1}]})}
                            className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 shadow-sm transition-all hover:shadow"
                          >
                            <Plus className="w-4 h-4" /> Add Material
                          </button>
                        </div>

                        <div className="space-y-3">
                          {formData.materials.map((mat, index) => (
                            <div key={index} className="flex gap-3 items-center p-3 bg-slate-50 border border-border rounded-xl">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Material</label>
                                <MaterialSearchSelect 
                                  value={mat.material_id}
                                  options={products.filter(p => !p.is_service && p.id !== editingId)}
                                  onChange={(val) => {
                                    const newMats = [...formData.materials];
                                    newMats[index].material_id = val;
                                    setFormData({...formData, materials: newMats});
                                  }}
                                />
                              </div>
                              <div className="w-32">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block ml-1">Quantity</label>
                                <input 
                                  type="number" step="0.01" min="0.01" placeholder="Qty"
                                  value={mat.quantity} 
                                  onChange={(e) => {
                                    const newMats = [...formData.materials];
                                    newMats[index].quantity = parseFloat(e.target.value) || 1;
                                    setFormData({...formData, materials: newMats});
                                  }}
                                  className="w-full h-9 px-3 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                />
                              </div>
                              <div className="pt-5">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newMats = [...formData.materials];
                                    newMats.splice(index, 1);
                                    setFormData({...formData, materials: newMats});
                                  }}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="Remove Material"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {formData.materials.length === 0 && (
                            <div className="text-sm text-muted-foreground italic text-center p-6 border-2 border-dashed border-border rounded-xl bg-slate-50/50">
                              No materials added. This service will not consume any stock from your inventory.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                  {/* Pricing Card */}
                  <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-green-500 rounded-full"></div> Pricing
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Selling Price *</label>
                        <input 
                          type="number" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm ring-2 ring-primary/20" required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Purchase Price</label>
                        <input 
                          type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1.5 text-slate-700">Wholesale Price</label>
                        <input 
                          type="number" step="0.01" value={formData.wholesale_price} onChange={(e) => setFormData({...formData, wholesale_price: parseFloat(e.target.value) || 0})}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory & Options Card */}
                  <div className="bg-white p-8 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-5 bg-amber-500 rounded-full"></div> Inventory & Type
                    </h3>
                    
                    <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-xl border border-border transition-colors hover:bg-muted/50 cursor-pointer" onClick={() => setFormData({...formData, is_service: !formData.is_service})}>
                      <input 
                        type="checkbox" id="is_service"
                        checked={formData.is_service} onChange={(e) => setFormData({...formData, is_service: e.target.checked})}
                        className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div>
                        <label htmlFor="is_service" className="block text-sm font-bold cursor-pointer" onClick={(e) => e.stopPropagation()}>Is a Service</label>
                        <p className="text-xs text-muted-foreground mt-0.5">Labor charge, repair, etc.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${formData.is_service ? 'text-slate-400' : 'text-slate-700'}`}>Current Stock</label>
                        <input 
                          type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value) || 0})}
                          disabled={formData.is_service}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50 disabled:bg-muted" required={!formData.is_service}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-1.5 ${formData.is_service ? 'text-slate-400' : 'text-slate-700'}`}>Reorder Level</label>
                        <input 
                          type="number" value={formData.reorder_level} onChange={(e) => setFormData({...formData, reorder_level: parseInt(e.target.value) || 0})}
                          disabled={formData.is_service}
                          className="w-full h-11 px-4 rounded-xl border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary shadow-sm disabled:opacity-50 disabled:bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold">Import Products</h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <span className="text-xl leading-none">&times;</span>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-sm mb-1 flex items-center"><Download className="w-4 h-4 mr-2" /> Step 1: Get the Template</h4>
                <p className="text-xs mb-3 opacity-80">Download the Excel template to ensure your data is formatted correctly.</p>
                <button 
                  onClick={handleDownloadTemplate}
                  className="text-xs bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  Download Template.xlsx
                </button>
              </div>

              <div className="p-4 bg-slate-50 text-slate-800 rounded-xl border border-slate-200">
                <h4 className="font-semibold text-sm mb-1 flex items-center"><Upload className="w-4 h-4 mr-2" /> Step 2: Upload Data</h4>
                <p className="text-xs mb-3 opacity-80">Upload your filled template here.</p>
                
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleImport}
                disabled={!importFile || isImporting}
                className="px-6 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center shadow-sm"
              >
                {isImporting ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Products;

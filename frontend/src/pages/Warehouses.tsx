import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react';
import { useDialogStore } from '../store/dialogStore';
import api from '../api/axios';

const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    is_default: false,
    status: 'Active'
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
      useDialogStore.getState().alert('Error', 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenForm = (warehouse: any = null) => {
    if (warehouse) {
      setFormData({
        name: warehouse.name,
        location: warehouse.location || '',
        is_default: warehouse.is_default === 1,
        status: warehouse.status
      });
      setEditingId(warehouse.id);
    } else {
      setFormData({
        name: '',
        location: '',
        is_default: false,
        status: 'Active'
      });
      setEditingId(null);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/warehouses/${editingId}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      setShowForm(false);
      fetchWarehouses();
      useDialogStore.getState().alert('Success', `Warehouse ${editingId ? 'updated' : 'created'} successfully!`);
    } catch (error: any) {
      useDialogStore.getState().alert('Error', error.response?.data?.message || 'Failed to save warehouse');
    }
  };

  const filtered = warehouses.filter(w => w.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 overflow-auto bg-muted/20 custom-scrollbar relative h-full">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Warehouses</h1>
            <p className="text-muted-foreground mt-1">Manage multiple store locations and warehouses</p>
          </div>
          <button 
            onClick={() => handleOpenForm()}
            className="h-11 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Warehouse
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search warehouses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 h-11 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      <div className="p-8">
        {loading ? (
          <div className="text-center text-muted-foreground py-12 animate-pulse">Loading warehouses...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(w => (
              <div key={w.id} className="bg-card rounded-xl border border-border shadow-sm p-6 hover:shadow-md transition-shadow relative">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {w.name}
                    {w.is_default === 1 && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-medium">Default</span>}
                  </h3>
                  <button onClick={() => handleOpenForm(w)} className="text-muted-foreground hover:text-primary">
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  <p>{w.location || 'No location specified'}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                  <div className="flex items-center gap-1 text-sm font-medium">
                    {w.status === 'Active' ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4"/> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4"/> Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                No warehouses found.
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div className="absolute inset-0 rounded-b-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">{editingId ? 'Edit' : 'Add'} Warehouse</h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Warehouse Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Set as Default Warehouse</span>
                </label>
              </div>
              
              <div className="pt-2">
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t bg-muted/30 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-md hover:bg-muted font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium shadow-sm transition-colors"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Warehouses;

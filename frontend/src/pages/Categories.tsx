import { useDialogStore } from '../store/dialogStore';
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '../api/axios';

interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  color_code: string;
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color_code: '#3b82f6' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
      } else {
        await api.post('/categories', formData);
      }
      setIsModalOpen(false);
      setFormData({ name: '', description: '', color_code: '#3b82f6' });
      setEditingId(null);
      fetchCategories();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEdit = (cat: Category) => {
    setFormData({ name: cat.name, description: cat.description || '', color_code: cat.color_code || '#3b82f6' });
    setEditingId(cat.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await useDialogStore.getState().confirm('Confirm', 'Are you sure you want to delete this category?')) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <button 
          onClick={() => {
            setFormData({ name: '', description: '', color_code: '#3b82f6' });
            setEditingId(null);
            setIsModalOpen(true);
          }}
          className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </button>
      </div>

      <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Color</th>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Description</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8">Loading...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No categories found.</td></tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color_code || '#3b82f6' }}></div>
                    </td>
                    <td className="px-6 py-4 font-medium">{cat.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{cat.description}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleEdit(cat)} className="text-blue-500 hover:text-blue-700 mr-3">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="text-destructive hover:text-destructive/80">
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
        <div className="absolute inset-0 rounded-b-xl bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Category' : 'Add Category'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color Code</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="color" 
                    value={formData.color_code}
                    onChange={(e) => setFormData({...formData, color_code: e.target.value})}
                    className="h-10 w-16 p-1 rounded border border-input bg-background"
                  />
                  <span className="text-sm text-muted-foreground">{formData.color_code}</span>
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 h-10 bg-muted text-muted-foreground rounded-md font-medium hover:bg-muted-foreground hover:text-background transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 h-10 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;

import { useState, useEffect } from 'react';
import { useDialogStore } from '../store/dialogStore';
import { Pencil, Trash2, Shield, User, CircleDot } from 'lucide-react';
import api from '../api/axios';
import { MODULE_REGISTRY } from '../store/windowStore';

export interface AppUser {
  id: number;
  username: string;
  full_name: string;
  role: 'Admin' | 'Manager' | 'Cashier' | 'Store Keeper';
  status: 'Active' | 'Inactive';
  created_at?: string;
  password?: string;
  modules?: string[];
}

const Users = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Cashier' | 'Store Keeper'>('Cashier');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err: any) {
      if (err.response?.status === 403) {
         useDialogStore.getState().alert('Access Denied', 'Only Admins can manage users.');
      } else {
         useDialogStore.getState().alert('Error', 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openNewModal = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('Cashier');
    setStatus('Active');
    setSelectedModules(['dashboard', 'pos']);
    setShowModal(true);
  };

  const openEditModal = (u: AppUser) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword(''); // leave blank if not changing
    setFullName(u.full_name);
    setRole(u.role);
    setStatus(u.status);
    setSelectedModules(u.modules || []);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, { 
          full_name: fullName, 
          role, 
          status, 
          password: password ? password : undefined,
          modules: selectedModules
        });
        useDialogStore.getState().alert('Success', 'User updated successfully');
      } else {
        if (!password) {
          useDialogStore.getState().alert('Error', 'Password is required for new users');
          return;
        }
        await api.post('/users', { username, password, full_name: fullName, role, modules: selectedModules });
        useDialogStore.getState().alert('Success', 'User created successfully');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      useDialogStore.getState().alert('Error', err.response?.data?.message || 'Failed to save user');
    }
  };

  const handleDelete = async (id: number, uname: string) => {
    const confirmed = await useDialogStore.getState().confirm(
      'Delete User',
      `Are you sure you want to delete ${uname}?`
    );
    if (!confirmed) return;
    
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
      useDialogStore.getState().alert('Success', 'User deleted');
    } catch (err) {
      useDialogStore.getState().alert('Error', 'Failed to delete user');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-muted-foreground text-sm">Manage system users, cashiers, and roles.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Add User
        </button>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-border shadow-sm flex flex-col min-h-0">
        <div className="overflow-auto custom-scrollbar flex-1 relative">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-muted/50 text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Username</th>
                <th className="px-6 py-4 font-semibold">Full Name</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {u.username.substring(0, 2).toUpperCase()}
                      </div>
                      {u.username}
                    </td>
                    <td className="px-6 py-4">{u.full_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 w-max
                        ${u.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                      `}>
                        {u.role === 'Admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 w-max
                        ${u.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}
                      `}>
                        <CircleDot className="w-3 h-3" />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openEditModal(u)} className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors mr-2">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(u.id, u.username)} className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30" disabled={u.username === 'admin'}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-4">{editingUser ? 'Edit User' : 'Create New User'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Username</label>
                <input 
                  type="text" required value={username} onChange={e => setUsername(e.target.value)}
                  disabled={!!editingUser}
                  className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Full Name</label>
                <input 
                  type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  Password {editingUser && <span className="text-xs text-muted-foreground font-normal">(Leave blank to keep current)</span>}
                </label>
                <input 
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required={!editingUser}
                  className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Role</label>
                  <select 
                    value={role} onChange={e => setRole(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Store Keeper">Store Keeper</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Status</label>
                  <select 
                    value={status} onChange={e => setStatus(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Module Access</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-2 border border-border rounded-lg bg-slate-50/50">
                  {Object.entries(MODULE_REGISTRY).map(([key, def]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-primary focus:ring-primary/50"
                        checked={selectedModules.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedModules([...selectedModules, key]);
                          else setSelectedModules(selectedModules.filter(m => m !== key));
                        }}
                      />
                      {def.title}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

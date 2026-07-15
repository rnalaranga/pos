import { useDialogStore } from '../store/dialogStore';
import { useSettingsStore } from '../store/settingsStore';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit, Trash2, Search, FileText, DollarSign, Users, Star, Settings, Award, CreditCard, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';

const COLORS = {
  Platinum: '#000000',
  Gold: '#F59E0B',
  Silver: '#9CA3AF',
  Bronze: '#B45309',
  Standard: '#3B82F6'
};

const Customers = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'analytics' | 'setup'>('directory');
  
  // -- Directory State --
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', address: '', customer_type: 'Walk-in', credit_limit: 0
  });

  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentRef, setPaymentRef] = useState('');

  // -- Analytics & Setup State --
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [setupFormData, setSetupFormData] = useState({
    loyalty_points_per_amount: '100',
    loyalty_point_value: '1',
    loyalty_min_redeem: '50',
    loyalty_max_discount_percent: '50',
    rating_bronze_threshold: '10000',
    rating_silver_threshold: '50000',
    rating_gold_threshold: '100000',
    rating_platinum_threshold: '500000'
  });

  const { currencySymbol, settings, fetchSettings, updateSettings } = useSettingsStore();

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalytics();
    }
  }, [activeTab]);

  useEffect(() => {
    if (settings) {
      setSetupFormData({
        loyalty_points_per_amount: settings.loyalty_points_per_amount?.toString() || '100',
        loyalty_point_value: settings.loyalty_point_value?.toString() || '1',
        loyalty_min_redeem: settings.loyalty_min_redeem?.toString() || '50',
        loyalty_max_discount_percent: settings.loyalty_max_discount_percent?.toString() || '50',
        rating_bronze_threshold: settings.rating_bronze_threshold?.toString() || '10000',
        rating_silver_threshold: settings.rating_silver_threshold?.toString() || '50000',
        rating_gold_threshold: settings.rating_gold_threshold?.toString() || '100000',
        rating_platinum_threshold: settings.rating_platinum_threshold?.toString() || '500000'
      });
    }
  }, [settings]);

  // -- Directory Functions --
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (error) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to save');
    }
  };

  const handleEdit = (cust: any) => {
    setFormData({
      name: cust.name,
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      customer_type: cust.customer_type || 'Walk-in',
      credit_limit: cust.credit_limit || 0
    });
    setEditingId(cust.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!await useDialogStore.getState().confirm('Confirm', 'Delete this customer?')) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchData();
    } catch (error: any) {
      useDialogStore.getState().alert('Message', error.response?.data?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', email: '', address: '', customer_type: 'Walk-in', credit_limit: 0 });
    setEditingId(null);
  };

  const handleOpenLedger = async (cust: any) => {
    setActiveCustomer(cust);
    try {
      const res = await api.get(`/customers/${cust.id}/ledger`);
      setLedgerData(res.data);
      setLedgerOpen(true);
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to load ledger');
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${activeCustomer.id}/payments`, {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: paymentRef
      });
      useDialogStore.getState().alert('Success', 'Payment recorded successfully');
      setPaymentAmount(''); setPaymentRef('');
      
      const res = await api.get(`/customers/${activeCustomer.id}/ledger`);
      setLedgerData(res.data);
      fetchData(); 
    } catch (e) {
      useDialogStore.getState().alert('Error', 'Failed to process payment');
    }
  };

  // -- Analytics & Setup Functions --
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const res = await api.get('/customers/analytics');
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleSaveSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(setupFormData);
      useDialogStore.getState().alert('Success', 'Loyalty and Rating thresholds saved successfully!');
    } catch (err) {
      useDialogStore.getState().alert('Error', 'Failed to save settings.');
    }
  };

  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)));

  return (
    <div className="flex flex-col h-full bg-background">
      
      {/* Universal Header with Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 border-b border-border bg-card shrink-0 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Customer Hub</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage directory, view analytics, and set loyalty rules</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
              activeTab === 'directory' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Directory</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
              activeTab === 'analytics' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('setup')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-md font-medium transition-all ${
              activeTab === 'setup' ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        
        {/* TAB 1: DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="space-y-6 fade-in animate-in">
            <div className="flex justify-between items-center">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input type="text" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm" />
              </div>
              <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors h-9 text-sm font-medium shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Add Customer
              </button>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                    <tr>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Contact</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Balance</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                    ) : filtered.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No customers found.</td></tr>
                    ) : (
                      filtered.map((c) => (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 font-medium flex items-center gap-2">
                            {c.name}
                            {c.rating && c.rating !== 'Standard' && (
                              <span className="w-2 h-2 rounded-full" title={c.rating} style={{ backgroundColor: (COLORS as any)[c.rating] }}></span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {c.phone && <div>{c.phone}</div>}
                            {c.email && <div className="text-xs">{c.email}</div>}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.customer_type === 'Credit' ? 'bg-orange-100 text-orange-800' : 'bg-muted'}`}>{c.customer_type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={Number(c.outstanding_balance) > 0 ? 'text-destructive font-medium' : ''}>{currencySymbol}{Number(c.outstanding_balance).toFixed(2)}</div>
                            {c.customer_type === 'Credit' && <div className="text-xs text-muted-foreground mt-1">Limit: {currencySymbol}{Number(c.credit_limit).toFixed(2)}</div>}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleOpenLedger(c)} className="bg-green-50 text-green-600 hover:bg-green-100 p-2 rounded-md transition-colors" title="Ledger & Payments"><FileText className="h-4 w-4" /></button>
                              <button onClick={() => handleEdit(c)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-md transition-colors" title="Edit"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(c.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-md transition-colors" title="Delete"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="fade-in animate-in h-full">
            {analyticsLoading ? (
              <div className="flex justify-center items-center h-[50vh] text-muted-foreground">Loading analytics...</div>
            ) : analyticsData ? (
              <div className="space-y-6">
                
                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Total Customers</div>
                      <div className="text-2xl font-bold">{analyticsData.stats?.totalCustomers?.toLocaleString()}</div>
                    </div>
                  </div>
                  
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                      <Star className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Points Distributed</div>
                      <div className="text-2xl font-bold">{analyticsData.stats?.totalPoints?.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                      <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground font-medium">Total Outstanding</div>
                      <div className="text-2xl font-bold text-red-600">{currencySymbol}{Number(analyticsData.stats?.totalOutstanding || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rating Distribution */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" /> 
                      Customer Rating Distribution
                    </h2>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.ratingDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {analyticsData.ratingDistribution.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name] || COLORS.Standard} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Customers */}
                  <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" /> 
                      Top Customers by Loyalty Points
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-muted text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Customer</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3 text-right">Total Purchases</th>
                            <th className="px-4 py-3 text-right rounded-tr-lg">Points</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {analyticsData.topCustomers.map((cust: any) => (
                            <tr key={cust.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium">{cust.name}</td>
                              <td className="px-4 py-3">
                                <span className="px-2.5 py-1 text-xs rounded-full font-medium" style={{ backgroundColor: `${(COLORS as any)[cust.rating]}15`, color: (COLORS as any)[cust.rating] }}>
                                  {cust.rating}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">{currencySymbol}{Number(cust.total_purchases).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-4 py-3 text-right font-bold text-primary">{cust.loyalty_points || 0}</td>
                            </tr>
                          ))}
                          {analyticsData.topCustomers.length === 0 && (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No customers found.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-600" /> 
                    Recent Customer Activity
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs uppercase bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-4 py-3 rounded-tl-lg">Date</th>
                          <th className="px-4 py-3">Customer</th>
                          <th className="px-4 py-3">Invoice No</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-right rounded-tr-lg">Points E/U</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analyticsData.recentActivity?.map((activity: any) => (
                          <tr key={activity.invoice_number} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(activity.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium">{activity.customer_name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{activity.invoice_number}</td>
                            <td className="px-4 py-3 text-right">{currencySymbol}{Number(activity.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-green-600 font-medium">+{activity.loyalty_points_earned || 0}</span>
                              <span className="text-muted-foreground mx-1">/</span>
                              <span className="text-red-600 font-medium">-{activity.loyalty_points_used || 0}</span>
                            </td>
                          </tr>
                        ))}
                        {(!analyticsData.recentActivity || analyticsData.recentActivity.length === 0) && (
                          <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No recent activity found.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[50vh] text-muted-foreground">Failed to load data.</div>
            )}
          </div>
        )}

        {/* TAB 3: SETUP */}
        {activeTab === 'setup' && (
          <div className="max-w-3xl mx-auto fade-in animate-in pb-8">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b pb-4">
                <Settings className="h-5 w-5 text-primary" /> 
                Configure Loyalty Rules
              </h2>
              
              <form onSubmit={handleSaveSetup} className="space-y-8">
                
                {/* Earning & Redemption Rules */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">Points Rules</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Points Rate */}
                    <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-xl">
                      <label className="block text-sm font-bold text-blue-700 mb-1">Points Earning Rate</label>
                      <p className="text-xs text-blue-600/70 mb-3">Amount to spend to earn 1 loyalty point.</p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">1 Pt per {currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.loyalty_points_per_amount}
                          onChange={e => setSetupFormData({...setupFormData, loyalty_points_per_amount: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-blue-200 bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                          required min="1"
                        />
                      </div>
                    </div>

                    {/* Redemption Value */}
                    <div className="p-5 bg-green-50/50 border border-green-100 rounded-xl">
                      <label className="block text-sm font-bold text-green-700 mb-1">Points Redemption Value</label>
                      <p className="text-xs text-green-600/70 mb-3">Currency discount given per 1 loyalty point redeemed.</p>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">1 Pt = {currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.loyalty_point_value}
                          onChange={e => setSetupFormData({...setupFormData, loyalty_point_value: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-green-200 bg-white focus:ring-2 focus:ring-green-500 font-medium"
                          required min="0" step="0.01"
                        />
                      </div>
                    </div>

                    {/* Minimum Redemption */}
                    <div className="p-5 bg-orange-50/50 border border-orange-100 rounded-xl">
                      <label className="block text-sm font-bold text-orange-700 mb-1">Minimum Points to Redeem</label>
                      <p className="text-xs text-orange-600/70 mb-3">Minimum points customer must have to use them.</p>
                      <input 
                        type="number" 
                        value={setupFormData.loyalty_min_redeem}
                        onChange={e => setSetupFormData({...setupFormData, loyalty_min_redeem: e.target.value})}
                        className="w-full h-10 px-3 rounded-md border border-orange-200 bg-white focus:ring-2 focus:ring-orange-500 font-medium"
                        required min="0"
                      />
                    </div>

                    {/* Maximum Discount */}
                    <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-xl">
                      <label className="block text-sm font-bold text-purple-700 mb-1">Max Discount Cap (%)</label>
                      <p className="text-xs text-purple-600/70 mb-3">Maximum % of the bill that can be paid via points.</p>
                      <input 
                        type="number" 
                        value={setupFormData.loyalty_max_discount_percent}
                        onChange={e => setSetupFormData({...setupFormData, loyalty_max_discount_percent: e.target.value})}
                        className="w-full h-10 px-3 rounded-md border border-purple-200 bg-white focus:ring-2 focus:ring-purple-500 font-medium"
                        required min="1" max="100"
                      />
                    </div>
                  </div>
                </div>

                {/* Rating Thresholds */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground border-b pb-2">Rating Tier Thresholds</h3>
                  <p className="text-xs text-muted-foreground -mt-2 mb-4">Set the minimum total purchase amount required for a customer to reach each tier.</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-xl bg-background">
                      <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.Bronze}}></span> Bronze Tier
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.rating_bronze_threshold}
                          onChange={e => setSetupFormData({...setupFormData, rating_bronze_threshold: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-input focus:ring-2 focus:ring-primary"
                          required min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-xl bg-background">
                      <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.Silver}}></span> Silver Tier
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.rating_silver_threshold}
                          onChange={e => setSetupFormData({...setupFormData, rating_silver_threshold: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-input focus:ring-2 focus:ring-primary"
                          required min="0"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-background">
                      <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.Gold}}></span> Gold Tier
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.rating_gold_threshold}
                          onChange={e => setSetupFormData({...setupFormData, rating_gold_threshold: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-input focus:ring-2 focus:ring-primary"
                          required min="0"
                        />
                      </div>
                    </div>

                    <div className="p-4 border rounded-xl bg-background">
                      <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.Platinum}}></span> Platinum Tier
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">{currencySymbol}</span>
                        <input 
                          type="number" 
                          value={setupFormData.rating_platinum_threshold}
                          onChange={e => setSetupFormData({...setupFormData, rating_platinum_threshold: e.target.value})}
                          className="w-full h-10 px-3 rounded-md border border-input focus:ring-2 focus:ring-primary"
                          required min="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t flex justify-end">
                  <button type="submit" className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-border w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-6 text-foreground">{editingId ? 'Edit Customer' : 'Add Customer'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Phone</label><input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary min-h-[80px]" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={formData.customer_type} onChange={(e) => setFormData({...formData, customer_type: e.target.value})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary">
                    <option value="Walk-in">Walk-in</option>
                    <option value="Registered">Registered</option>
                    <option value="Credit">Credit</option>
                  </select>
                </div>
                {formData.customer_type === 'Credit' && (
                  <div><label className="block text-sm font-medium mb-1">Credit Limit</label><input type="number" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})} className="w-full h-10 px-3 rounded-md border border-input bg-background focus:ring-2 focus:ring-primary" required /></div>
                )}
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 h-12 btn-primary">{editingId ? 'Update' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {ledgerOpen && activeCustomer && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-[95vw] h-[95vh] flex flex-col relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30 shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5" /> 
                Ledger: {activeCustomer.name}
              </h2>
              <button onClick={() => setLedgerOpen(false)} className="text-muted-foreground hover:text-foreground">Close</button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 border-r border-border overflow-auto p-4 custom-scrollbar">
                <h3 className="font-semibold text-lg mb-3">Transaction History</h3>
                <table className="w-full text-base text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-sm">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Ref/Notes</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerData.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-4">No transactions</td></tr>
                    ) : ledgerData.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{new Date(row.date).toLocaleString()}</td>
                        <td className="px-3 py-2 font-medium">
                          <span className={row.type === 'Invoice' ? 'text-destructive' : 'text-green-600'}>{row.type}</span>
                        </td>
                        <td className="px-3 py-2">{row.ref} {row.notes ? `(${row.notes})` : ''}</td>
                        <td className="px-3 py-2 text-right">{currencySymbol}{Number(row.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="w-full lg:w-[400px] p-6 bg-muted/20 border-l border-border flex flex-col">
                <div className="bg-white border border-border rounded-xl p-6 mb-6 text-center shadow-sm">
                  <div className="text-sm text-muted-foreground uppercase tracking-wider mb-2 font-medium">Outstanding Balance</div>
                  <div className={`text-4xl font-bold ${Number(activeCustomer.outstanding_balance) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {currencySymbol}{Number(activeCustomer.outstanding_balance).toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Loyalty Points: <span className="font-bold text-primary">{activeCustomer.loyalty_points}</span>
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 border-b pb-2">
                  <DollarSign className="h-5 w-5 text-green-600" /> Receive Payment
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
    </div>
  );
};

export default Customers;

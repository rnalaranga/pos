import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Package, Users, AlertTriangle } from 'lucide-react';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const Dashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { currencySymbol } = useSettingsStore();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/reports/dashboard');
        setStats(res.data);
      } catch (error) {
        console.error("Failed to load dashboard stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-lg text-muted-foreground">Loading Dashboard...</div>;
  }

  if (!stats) {
    return <div className="flex h-full items-center justify-center text-lg text-destructive">Failed to load dashboard data.</div>;
  }

  const { summary, salesTrend, topProducts } = stats;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Today's Sales</h3>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{currencySymbol}{Number(summary.todaySales).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground mt-1">From completed sales</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Products</h3>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{summary.totalProducts}</div>
          <p className="text-xs text-muted-foreground mt-1">Active inventory items</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between border-destructive/20 bg-destructive/5 hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium text-destructive">Low Stock Alerts</h3>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold text-destructive">{summary.lowStockItems}</div>
          <p className="text-xs text-muted-foreground mt-1">Needs immediate reorder</p>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2 space-y-0">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Total Customers</h3>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">{summary.totalCustomers}</div>
          <p className="text-xs text-muted-foreground mt-1">Registered clients</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Sales Trend Chart */}
        <div className="rounded-xl border bg-card shadow-sm col-span-4 p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Sales Trend (Last 7 Days)</h3>
          <div className="flex-1 min-h-[300px]">
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(val) => `${currencySymbol}${val}`} tick={{fontSize: 12}} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [`${currencySymbol}${Number(value).toFixed(2)}`, 'Sales']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No sales data for the last 7 days.</div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="rounded-xl border bg-card shadow-sm col-span-3 p-6 flex flex-col">
          <h3 className="font-semibold text-lg mb-4">Top 5 Selling Products</h3>
          <div className="flex-1 min-h-[300px]">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={100} axisLine={false} tickLine={false} />
                  <Tooltip 
                    formatter={(value: any) => [`${value} units`, 'Sold']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="sold_qty" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No product data available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

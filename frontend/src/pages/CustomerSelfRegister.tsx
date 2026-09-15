import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';

const CustomerSelfRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [settings, setSettings] = useState<any>({});

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    // Set theme color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', '#26316C'); // Primary color
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#26316C';
      document.head.appendChild(meta);
    }

    // Fetch settings for logo
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/settings`);
        const data = await res.json();
        if (data) setSettings(data);
      } catch (err) {
        console.error('Failed to fetch settings', err);
      }
    };
    fetchSettings();
  }, [API_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/customers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, customer_type: 'Registered' }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to register. Please try again.');
      }
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border-t-8 border-t-green-500 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-black text-slate-800 mb-2">Success!</h2>
          <p className="text-slate-600 mb-8 font-medium">Thank you for registering. You can now use your phone number for future purchases to earn points.</p>
          <button 
            onClick={() => { setSuccess(false); setFormData({name: '', phone: '', email: '', address: ''}); }}
            className="w-full h-14 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg active:scale-95"
          >
            Register Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-primary p-4 sm:p-8 relative overflow-y-auto overflow-x-hidden">
      
      <div className="w-full max-w-md flex flex-col items-center mt-4 mb-8">
        {settings.company_logo ? (
          <img src={settings.company_logo} alt={settings.company_name || 'Logo'} className="max-h-20 object-contain drop-shadow-xl mb-2" />
        ) : (
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-2 border border-white/30 shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
        )}
        <h1 className="text-3xl font-black text-white text-center drop-shadow-md">{settings.company_name || 'Welcome'}</h1>
        <p className="text-white/80 text-sm mt-1 text-center font-medium">Join our loyalty program</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[32px] shadow-2xl max-w-md w-full relative z-10 animate-in slide-in-from-bottom-8 duration-500">
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center border border-red-200 shadow-sm flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Name *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-slate-800"
                placeholder="John Doe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Phone Number *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-slate-800"
                placeholder="077 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email (Optional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-slate-800"
                placeholder="john@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Address (Optional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary/40">
                <MapPin className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full h-14 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-semibold text-slate-800"
                placeholder="Colombo, Sri Lanka"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 mt-6 bg-primary text-primary-foreground rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 active:scale-95 disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              'Register Now'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Powered by EPOS
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelfRegister;

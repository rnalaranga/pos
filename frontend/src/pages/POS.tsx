import { useDialogStore } from '../store/dialogStore';
import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Banknote, Trash2, Star, Folder } from 'lucide-react';
import { usePosStore, Product } from '../store/posStore';
import { renderToString } from 'react-dom/server';
import { Receipt80mm } from '../components/pos/Receipt';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const COLORS = {
  Platinum: '#000000',
  Gold: '#F59E0B',
  Silver: '#9CA3AF',
  Bronze: '#B45309',
  Standard: '#3B82F6'
};

const POS = () => {
  const { 
    cart, products, fetchProducts, addToCart, removeFromCart, updateCartItem, 
    subtotal, totalTax, totalDiscount, grandTotal, processSale, clearCart
  } = usePosStore();
  
  const [searchInput, setSearchInput] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchIndex, setSearchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Item Edit State
  const [editingItem, setEditingItem] = useState<{ id: number; name: string; sku: string; selling_price: number; quantity: number; discount: number; barcode: string; is_service: boolean; category_id?: number | null; stock: number; } | null>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingItem) {
      setTimeout(() => qtyInputRef.current?.select(), 50);
    }
  }, [editingItem?.id]);

  const handleProductClick = (p: Product) => {
    const existing = cart.find(c => c.id === p.id);
    if (existing) {
      setEditingItem({ ...existing });
    } else {
      setEditingItem({ ...p, quantity: 1, discount: 0 });
    }
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    const existingIndex = cart.findIndex(c => c.id === editingItem.id);
    if (existingIndex >= 0) {
      updateCartItem(editingItem.id, { 
        quantity: editingItem.quantity, 
        selling_price: editingItem.selling_price, 
        discount: editingItem.discount 
      });
    } else {
      addToCart(editingItem, editingItem.quantity, editingItem.selling_price, editingItem.discount);
    }
    setEditingItem(null);
    setSearchInput('');
    setSearchIndex(-1);
    setFilteredProducts([]);
  };
  
  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Held Bills State
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);

  // Navigation state for categories
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState<number | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<number | null>(null);

  // Derived state for display
  const activeSubCategories = selectedMainCategory 
    ? categories.filter(c => c.parent_id === selectedMainCategory) 
    : [];
    
  const activeSubCatIds = activeSubCategories.map(c => c.id);

  const displayProducts = products.filter(p => {
    if (selectedSubCategory) {
      return p.category_id === selectedSubCategory;
    }
    if (selectedMainCategory) {
      return p.category_id === selectedMainCategory || activeSubCatIds.includes(p.category_id);
    }
    return true; // All items
  });
  
  // Customer & Loyalty State
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // New Customer Modal State
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const { customer, setCustomer, globalDiscount, setGlobalDiscount, loyaltyPointsUsed, setLoyaltyPointsUsed } = usePosStore();
  const { currencySymbol, settings } = useSettingsStore();
  
  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (e) {
      console.error("Failed to fetch customers");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    try {
      const res = await api.post('/customers', newCustomer);
      await fetchCustomers();
      const addedCust = res.data;
      // The API returns {id, name}, we can manually fetch the full object or let it just have basic details
      setCustomer({ id: addedCust.id, name: addedCust.name, loyalty_points: 0, rating: 'Standard' });
      setShowNewCustomer(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      useDialogStore.getState().alert('Success', 'Customer added successfully');
    } catch (err) {
      useDialogStore.getState().alert('Error', 'Failed to add customer');
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    
    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPayment(false);
        setShowHeldBills(false);
      } else if (settings?.shortcut_discount && e.key === settings.shortcut_discount) {
        e.preventDefault();
        document.getElementById('global-discount-input')?.focus();
      } else if (settings?.shortcut_print && e.key === settings.shortcut_print) {
        e.preventDefault();
        const confirmBtn = document.getElementById('confirm-payment-btn');
        if (confirmBtn) {
          confirmBtn.click();
        } else if (usePosStore.getState().cart.length > 0) {
          setAmountPaid(usePosStore.getState().grandTotal);
          setShowPayment(true);
        }
      } else if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        clearCart();
      } else if (e.key === 'F3') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setShowHeldBills(true);
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (usePosStore.getState().cart.length > 0) {
          setAmountPaid(usePosStore.getState().grandTotal);
          setShowPayment(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Load held bills
    const saved = localStorage.getItem('held_bills');
    if (saved) setHeldBills(JSON.parse(saved));

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customer, globalDiscount, loyaltyPointsUsed, settings]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (searchInput.trim() === '') {
      setFilteredProducts([]);
      return;
    }
    
    const searchTerms = searchInput.toLowerCase().trim().split(/\s+/);
    const matches = products.filter(p => {
      const name = p.name.toLowerCase();
      const barcode = p.barcode ? p.barcode.toLowerCase() : '';
      const sku = p.sku ? p.sku.toLowerCase() : '';
      
      return searchTerms.every(term => 
        name.includes(term) || barcode.includes(term) || sku.includes(term)
      );
    }).sort((a, b) => (Number(b.total_sold) || 0) - (Number(a.total_sold) || 0));
    setFilteredProducts(matches);
    setSearchIndex(-1); // reset selection on new search
  }, [searchInput, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchIndex >= 0 ? filteredProducts[searchIndex] : filteredProducts[0];
    if (target) {
      handleProductClick(target);
      setSearchInput('');
      setSearchIndex(-1);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchInput('');
      setFilteredProducts([]);
    }
  };

  const handleHoldBill = () => {
    if (cart.length === 0) {
      useDialogStore.getState().alert('Message', "Cart is empty!");
      return;
    }
    const newBill = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      cart,
      customer,
      globalDiscount,
      loyaltyPointsUsed,
      grandTotal
    };
    const updatedBills = [...heldBills, newBill];
    setHeldBills(updatedBills);
    localStorage.setItem('held_bills', JSON.stringify(updatedBills));
    clearCart();
    useDialogStore.getState().alert('Message', "Bill held successfully!");
  };

  const handleRecallBill = (billId: number) => {
    const bill = heldBills.find(b => b.id === billId);
    if (bill) {
      // Need to write these values into the store directly, but usePosStore doesn't expose a 'setCart'
      // Instead, we clear cart and add them one by one
      clearCart();
      bill.cart.forEach((item: any) => {
        addToCart(item, item.quantity, item.selling_price, item.discount);
      });
      setCustomer(bill.customer);
      setGlobalDiscount(bill.globalDiscount);
      setLoyaltyPointsUsed(bill.loyaltyPointsUsed);
      
      const updatedBills = heldBills.filter(b => b.id !== billId);
      setHeldBills(updatedBills);
      localStorage.setItem('held_bills', JSON.stringify(updatedBills));
      setShowHeldBills(false);
    }
  };

  const handleCheckout = async () => {
    if (amountPaid < grandTotal && paymentMethod === 'Cash') {
      useDialogStore.getState().alert('Message', "Amount paid is less than the total");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await processSale(paymentMethod, amountPaid);
      
      // Try to print if in Electron
      if ((window as any).electronAPI) {
        try {
          const receiptHtml = renderToString(
            <Receipt80mm 
              invoiceNumber={result.invoice_number}
              cashierName="Cashier" 
              date={new Date().toLocaleString()}
              items={cart.map(i => ({ name: i.name, quantity: i.quantity, unit_price: i.selling_price, subtotal: i.subtotal }))}
              subtotal={subtotal}
              discount={totalDiscount}
              tax={totalTax}
              total={grandTotal}
              amountPaid={amountPaid}
              paymentMethod={paymentMethod}
              companyName={settings.company_name}
              companyAddress={settings.company_address}
              footerMessage={settings.receipt_footer}
              currencySymbol={currencySymbol}
              companyLogo={settings.company_logo}
              companyPhone={settings.company_phone}
              customerName={customer?.name || 'Walk-in'}
            />
          );
          
          // Add basic styling for the print window to work standalone
          const fullHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <style>
                  body { margin: 0; padding: 0; font-family: monospace; }
                  .w-\\[80mm\\] { width: 80mm; margin: 0 auto; }
                  .p-4 { padding: 1rem; }
                  .text-center { text-align: center; }
                  .text-xl { font-size: 1.25rem; }
                  .font-bold { font-weight: bold; }
                  .text-xs { font-size: 0.75rem; }
                  .mb-1 { margin-bottom: 0.25rem; }
                  .mb-2 { margin-bottom: 0.5rem; }
                  .mb-4 { margin-bottom: 1rem; }
                  .pb-1 { padding-bottom: 0.25rem; }
                  .pb-2 { padding-bottom: 0.5rem; }
                  .pt-1 { padding-top: 0.25rem; }
                  .pt-2 { padding-top: 0.5rem; }
                  .mt-1 { margin-top: 0.25rem; }
                  .mt-2 { margin-top: 0.5rem; }
                  .mt-4 { margin-top: 1rem; }
                  .mt-6 { margin-top: 1.5rem; }
                  .border-b { border-bottom: 1px solid black; }
                  .border-t { border-top: 1px solid black; }
                  .border-dashed { border-style: dashed; }
                  .flex { display: flex; }
                  .justify-between { justify-content: space-between; }
                  .w-1\\/2 { width: 50%; }
                  .w-1\\/6 { width: 16.666%; }
                  .w-1\\/3 { width: 33.333%; }
                  .text-right { text-align: right; }
                  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                </style>
              </head>
              <body>${receiptHtml}</body>
            </html>
          `;
          
          await (window as any).electronAPI.printReceipt(fullHtml, { 
            preview: settings?.print_preview === 'true', 
            deviceName: settings?.default_printer 
          });
        } catch (e) {
          console.error("Printing error", e);
        }
      } else {
        // Fallback for web browser
        const receiptHtml = renderToString(
          <Receipt80mm 
            invoiceNumber={result.invoice_number}
            cashierName="Cashier" 
            date={new Date().toLocaleString()}
            items={cart.map(i => ({ name: i.name, quantity: i.quantity, unit_price: i.selling_price, subtotal: i.subtotal }))}
            subtotal={subtotal}
            discount={totalDiscount}
            tax={totalTax}
            total={grandTotal}
            amountPaid={amountPaid}
            paymentMethod={paymentMethod}
            companyName={settings.company_name}
            companyAddress={settings.company_address}
            companyPhone={settings.company_phone}
            customerName={customer?.name || 'Walk-in'}
            footerMessage={settings.receipt_footer}
            currencySymbol={currencySymbol}
            companyLogo={settings.company_logo}
          />
        );

        const printWindow = window.open('', '_blank', 'width=400,height=600');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Receipt</title>
                <style>
                  body { font-family: monospace; padding: 10px; width: 80mm; margin: 0 auto; }
                  .text-center { text-align: center; }
                  .text-xl { font-size: 1.25rem; }
                  .font-bold { font-weight: bold; }
                  .text-xs { font-size: 0.75rem; }
                  .mb-1 { margin-bottom: 0.25rem; }
                  .mb-2 { margin-bottom: 0.5rem; }
                  .mb-4 { margin-bottom: 1rem; }
                  .pb-1 { padding-bottom: 0.25rem; }
                  .border-b { border-bottom: 1px solid black; }
                  .border-t { border-top: 1px solid black; }
                  .flex { display: flex; }
                  .justify-between { justify-content: space-between; }
                  .text-right { text-align: right; }
                  .w-1\\/2 { width: 50%; }
                  .w-1\\/6 { width: 16.666%; }
                  .w-1\\/3 { width: 33.333%; }
                  .truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                </style>
              </head>
              <body>${receiptHtml}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        }
      }

      useDialogStore.getState().alert('Message', `Sale completed! Invoice: ${result.invoice_number}`);
      setShowPayment(false);
      setAmountPaid(0);
    } catch (error) {
      useDialogStore.getState().alert('Message', "Failed to process sale");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-1 gap-4 overflow-hidden h-full">
      {/* LEFT SIDE - Product Search and Grid */}
      <div className="flex-[3] flex flex-col gap-4 relative min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-2xl blur-xl opacity-50"></div>
          <div className="relative flex items-center">
            <Search className="absolute left-4 h-6 w-6 text-primary/60" />
            <input 
              ref={searchInputRef}
              type="text" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by Barcode, SKU, or Name (F1)" 
              className="w-full h-14 pl-14 pr-4 text-lg rounded-2xl outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all bg-white/90 backdrop-blur-sm border border-transparent shadow-lg text-foreground font-medium placeholder:text-muted-foreground/60"
              autoFocus
            />
          </div>
          
        </form>
        
        {/* Main Content Split */}
        <div className="flex-1 flex gap-4 min-h-0">
          
          {/* Left Sidebar - Main Categories */}
          {!searchInput && (
            <div className="w-[100px] shrink-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar pb-4 pr-1">
              <button 
                onClick={() => { setSelectedMainCategory(null); setSelectedSubCategory(null); }}
                className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm border ${
                  selectedMainCategory === null 
                    ? 'bg-primary text-primary-foreground scale-105 border-primary/50' 
                    : 'bg-white hover:bg-slate-50 border-border text-muted-foreground hover:scale-105'
                }`}
              >
                <div className="p-2 rounded-full bg-white/20">
                  <Star className={`h-6 w-6 ${selectedMainCategory === null ? 'text-white' : 'text-primary'}`} />
                </div>
                <span className="text-xs font-bold text-center leading-tight">All Items</span>
              </button>
              
              {categories.filter(c => !c.parent_id).map((c, idx) => (
                <button 
                  key={`main-${c.id}`}
                  onClick={() => { setSelectedMainCategory(c.id); setSelectedSubCategory(null); }}
                  className={`w-full aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all shadow-sm border relative overflow-hidden animate-in fade-in slide-in-from-left-4 duration-300 ${
                    selectedMainCategory === c.id 
                      ? 'text-white scale-105 border-transparent' 
                      : 'bg-white hover:bg-slate-50 border-border text-muted-foreground hover:scale-105'
                  }`}
                  style={{ 
                    backgroundColor: selectedMainCategory === c.id ? (c.color_code || '#3b82f6') : undefined,
                    animationDelay: `${idx * 50}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  {selectedMainCategory === c.id && (
                    <div className="absolute inset-0 bg-black/10"></div>
                  )}
                  <div className="p-2 rounded-full relative z-10" style={{ backgroundColor: selectedMainCategory === c.id ? 'rgba(255,255,255,0.2)' : `${c.color_code || '#3b82f6'}15` }}>
                    <Folder className="h-6 w-6" style={{ color: selectedMainCategory === c.id ? '#fff' : (c.color_code || '#3b82f6') }} />
                  </div>
                  <span className="text-[11px] font-bold text-center leading-tight relative z-10 px-1">{c.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right Grid Area */}
          <div className="flex-1 flex flex-col min-w-0">
            
            {/* Subcategory Pills */}
            {!searchInput && selectedMainCategory !== null && activeSubCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-3 shrink-0 mb-1 animate-in slide-in-from-top-4 fade-in duration-300">
                <button 
                  onClick={() => setSelectedSubCategory(null)}
                  className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                    selectedSubCategory === null 
                      ? 'bg-foreground text-background border-transparent' 
                      : 'bg-white hover:bg-slate-50 border-border text-muted-foreground'
                  }`}
                >
                  All in Category
                </button>
                {activeSubCategories.map(sub => (
                  <button 
                    key={`sub-${sub.id}`}
                    onClick={() => setSelectedSubCategory(sub.id)}
                    className={`px-5 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                      selectedSubCategory === sub.id 
                        ? 'bg-foreground text-background border-transparent' 
                        : 'bg-white hover:bg-slate-50 border-border text-muted-foreground'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            )}

            {/* Product Grid */}
            <div className="flex-1 rounded-2xl overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start pb-4">
                {searchInput ? (
                  // Search Mode
                  filteredProducts.map((p, idx) => (
                    <div 
                      key={`search-${p.id}`}
                      onClick={() => handleProductClick(p)}
                      className={`glass-card p-4 min-h-[110px] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col animate-in zoom-in-95 fade-in duration-300 border-2 shadow-sm ${idx === 0 ? 'border-primary bg-primary/10 shadow-primary/20' : 'border-transparent hover:border-primary/20'}`}
                      style={{ animationDelay: `${(idx % 12) * 50}ms`, animationFillMode: 'both' }}
                    >
                      <div className="font-extrabold text-[13px] leading-tight line-clamp-3 text-slate-800 tracking-tight mb-2">{p.name}</div>
                      <div className="flex justify-between items-end mt-auto">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded border border-slate-200">{p.sku || p.barcode || '---'}</div>
                        <div className="font-black text-[14px] text-primary">{currencySymbol}{Number(p.selling_price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  // Normal Mode
                  <>
                    {displayProducts.map((p, idx) => (
                      <div 
                        key={`prod-${p.id}`}
                        onClick={() => handleProductClick(p)}
                        className="glass-card p-4 min-h-[110px] cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col animate-in zoom-in-95 fade-in duration-300 border-2 border-transparent hover:border-primary/20 shadow-sm"
                        style={{ animationDelay: `${(idx % 15) * 40}ms`, animationFillMode: 'both' }}
                      >
                        <div className="font-extrabold text-[13px] leading-tight line-clamp-3 text-slate-800 tracking-tight mb-2">{p.name}</div>
                        <div className="flex justify-between items-end mt-auto">
                          <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded border border-slate-200">{p.sku || p.barcode || '---'}</div>
                          <div className="font-black text-[14px] text-primary">{currencySymbol}{Number(p.selling_price).toFixed(2)}</div>
                        </div>
                      </div>
                    ))}
                    {!searchInput && displayProducts.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                        <p>No products in this category</p>
                      </div>
                    )}
                  </>
                )}
                
                {searchInput && products.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
                    <p>No products found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - Sticky Cart & Actions */}
      <div className="w-[380px] flex-[2] max-w-[420px] flex flex-col gap-3 shrink-0">
        
        {/* Cart Items List */}
        <div className="flex-1 rounded-2xl flex flex-col overflow-hidden bg-white border border-border shadow-sm">
          <div className="p-3 font-bold text-xs tracking-wide flex justify-between items-center bg-muted/30 border-b border-border text-muted-foreground">
            <span>CART ({cart.length})</span>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[10px] text-destructive hover:underline uppercase">Clear</button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>🛒</div>
                <p className="font-medium">Cart is empty.<br/>Tap products to add.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => setEditingItem({ ...item })}
                  className="py-1.5 px-2 rounded-lg flex gap-2 items-center relative group transition-all hover:bg-muted/40 border border-transparent hover:border-border cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[13px] leading-tight line-clamp-1 text-slate-800">{item.name}</div>
                    <div className="text-[10px] font-semibold mt-0.5 text-slate-500">{currencySymbol}{Number(item.selling_price).toFixed(2)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="font-black text-[13px] text-primary">{currencySymbol}{item.subtotal.toFixed(2)}</div>
                    <div className="flex items-center bg-slate-100 rounded-md border border-slate-200">
                      <button onClick={(e) => { e.stopPropagation(); updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) }) }} className="w-5 h-5 flex items-center justify-center rounded-l-md hover:bg-white text-sm font-medium text-slate-700 hover:text-primary transition-colors">-</button>
                      <span className="w-5 text-center font-bold text-[11px] text-slate-800 bg-white/50">{item.quantity}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateCartItem(item.id, { quantity: item.quantity + 1 }) }} className="w-5 h-5 flex items-center justify-center rounded-r-md hover:bg-white text-sm font-medium text-slate-700 hover:text-primary transition-colors">+</button>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10 bg-destructive text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="rounded-xl p-3 flex flex-col justify-center shrink-0 bg-white border border-border shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <h3 className="font-bold flex items-center text-[10px] tracking-wide text-foreground/80">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> CUSTOMER
            </h3>
            <button 
              onClick={() => setShowNewCustomer(true)}
              className="text-[9px] uppercase font-bold text-primary hover:bg-primary/10 px-2 py-0.5 rounded"
            >
              + Add New
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={customer ? `${customer.name} ${customer.phone ? `(${customer.phone})` : ''}` : customerSearch}
              onChange={(e) => {
                setCustomer(null);
                setLoyaltyPointsUsed(0);
                setCustomerSearch(e.target.value);
                setShowCustomerDropdown(true);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
              className="w-full h-9 px-3 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs font-semibold transition-shadow bg-muted/20 text-foreground"
            />
            {showCustomerDropdown && (
              <div className="absolute top-full mt-1 left-0 w-full bg-white rounded-xl shadow-lg max-h-48 overflow-auto z-50 border border-border p-1">
                <div 
                  className="p-2 hover:bg-muted rounded-lg cursor-pointer text-sm font-semibold text-muted-foreground"
                  onClick={() => { setCustomer(null); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                >
                  Walk-in Customer (Clear)
                </div>
                {customers
                  .filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone && c.phone.includes(customerSearch)))
                  .map(c => (
                    <div 
                      key={c.id}
                      className="p-2 hover:bg-primary/5 rounded-lg cursor-pointer transition-colors"
                      onClick={() => {
                        setCustomer(c);
                        setLoyaltyPointsUsed(0);
                        setShowCustomerDropdown(false);
                      }}
                    >
                      <div className="font-bold text-sm" style={{ color: '#26316C' }}>{c.name}</div>
                      <div className="text-xs text-muted-foreground flex justify-between items-center mt-1">
                        <span>{c.phone || 'No phone'}</span>
                        {c.rating && c.rating !== 'Standard' && (
                          <span className="flex items-center gap-1 font-bold" style={{ color: (COLORS as any)[c.rating] }}>
                            {c.rating} <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {c.rating === 'Standard' && (
                          <span className="text-muted-foreground/70 font-medium">{c.rating}</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Totals */}
        <div className="rounded-2xl p-3 flex flex-col shrink-0 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="space-y-2 font-semibold text-foreground relative z-10">
            <div className="flex justify-between items-center opacity-90 text-[11px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-[13px]">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold opacity-90 flex items-center text-muted-foreground">
                Discount 
                {customer?.rating && customer.rating !== 'Standard' && (
                  <span className="ml-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Star className="h-2 w-2 fill-current" /> {customer.rating} (-{usePosStore.getState().customerDiscountPercentage}%)
                  </span>
                )}
              </span>
              <div className="flex items-center">
                <span className="mr-1.5 text-muted-foreground font-bold text-xs">{currencySymbol}</span>
                <input 
                  id="global-discount-input"
                  type="number" min="0" step="0.01" value={globalDiscount || ''}
                  placeholder="0.00"
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-10 text-right rounded-lg focus:ring-2 focus:ring-primary px-3 font-bold text-lg transition-all border-2 border-border bg-white shadow-inner text-primary" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 bg-primary/5 p-2 rounded-lg border border-primary/10">
              <div className="flex justify-between items-center opacity-90 text-[11px]">
                <span className="text-primary/80 font-bold flex flex-col">
                  <span>Pay with Points</span>
                  <span className="text-[9px] opacity-70">(1pt = {currencySymbol}{settings?.loyalty_point_value || 1})</span>
                </span>
                <div className="flex items-center">
                  <span className="mr-1.5 text-primary font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">PTS</span>
                  <input 
                    type="number" min="0" max={customer?.loyalty_points || 0} value={loyaltyPointsUsed || ''}
                    placeholder="0"
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val > (customer?.loyalty_points || 0)) val = customer?.loyalty_points || 0;
                      
                      const maxPercent = parseInt(settings?.loyalty_max_discount_percent) || 100;
                      const baseTotal = subtotal + totalTax - globalDiscount - (subtotal * (usePosStore.getState().customerDiscountPercentage / 100));
                      const maxDiscountVal = baseTotal * (maxPercent / 100);
                      const pointVal = parseFloat(settings?.loyalty_point_value) || 1;
                      const maxPointsAllowed = Math.floor(maxDiscountVal / pointVal);
                      
                      if (val > maxPointsAllowed) val = maxPointsAllowed;
                      
                      setLoyaltyPointsUsed(val);
                    }}
                    disabled={!customer || (customer.loyalty_points < (parseInt(settings?.loyalty_min_redeem) || 0))}
                    className="w-16 h-7 text-right rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 px-2 font-bold text-xs transition-all disabled:opacity-40 border border-primary/20 bg-white shadow-sm text-primary" 
                  />
                </div>
              </div>
              {customer && customer.loyalty_points < parseInt(settings?.loyalty_min_redeem || '0') && (
                <div className="text-[9px] text-orange-500 font-bold bg-orange-500/10 px-1.5 py-0.5 rounded w-fit mt-0.5">
                  Min redeemable: {settings?.loyalty_min_redeem} pts
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t border-dashed border-primary/20 pt-2.5 mt-2.5 flex justify-between items-end relative z-10">
            <div className="flex flex-col">
              <span className="font-bold text-[10px] tracking-widest text-primary/70">GRAND TOTAL</span>
            </div>
            <span className="text-2xl font-black text-primary tracking-tight leading-none">{currencySymbol}{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons & Checkout */}
        <div className="flex flex-col gap-3 shrink-0 mt-1">
          <div className="flex gap-2">
            <button onClick={handleHoldBill} className="flex-1 h-9 rounded-xl font-bold transition-all hover:bg-blue-100 active:scale-95 bg-blue-50/80 text-blue-700 text-[11px] border border-blue-200/60 uppercase tracking-wide shadow-sm">
              Hold
            </button>
            <button onClick={() => setShowHeldBills(true)} className="flex-1 h-9 rounded-xl font-bold transition-all hover:bg-amber-100 active:scale-95 bg-amber-50/80 text-amber-700 text-[11px] border border-amber-200/60 uppercase tracking-wide shadow-sm">
              Recall
            </button>
            <button onClick={() => { clearCart(); setGlobalDiscount(0); setCustomer(null); setShowPayment(false); }} className="flex-1 h-9 rounded-xl font-bold transition-all hover:bg-red-100 active:scale-95 bg-red-50/80 text-red-700 text-[11px] border border-red-200/60 uppercase tracking-wide shadow-sm">
              Cancel
            </button>
          </div>
          
          <button 
            onClick={() => {
              if (cart.length > 0) {
                setAmountPaid(grandTotal);
                setShowPayment(true);
              }
            }}
            disabled={cart.length === 0}
            className="h-14 rounded-2xl font-bold text-lg transition-all hover:scale-[0.98] flex items-center justify-center disabled:opacity-50 disabled:scale-100 btn-primary shadow-lg hover:shadow-xl"
          >
            <Banknote className="h-5 w-5 mr-2 opacity-80" />
            <span className="tracking-wide">Place Order • {currencySymbol}{grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="absolute inset-0 rounded-b-xl flex items-center justify-center z-[100] fade-in-up bg-black/20 backdrop-blur-sm">
          <div className="p-8 rounded-3xl w-full max-w-md bg-white border border-border shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground">Complete Payment</h2>
            
            <div className="mb-6 p-5 rounded-2xl flex flex-col gap-1 items-center bg-muted/30 border border-border">
              {totalDiscount > 0 && (
                <span className="font-bold text-sm text-green-600 line-through opacity-70">
                  {currencySymbol}{(grandTotal + totalDiscount).toFixed(2)}
                </span>
              )}
              <span className="font-semibold text-lg text-primary/80">Total Due</span>
              <span className="text-5xl font-black text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2 text-primary/80 uppercase tracking-wider">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash', 'Card', 'QR'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`h-12 rounded-xl font-bold transition-all ${paymentMethod === method ? 'scale-105 shadow-md' : 'hover:bg-black/5 scale-100'}`}
                      style={paymentMethod === method ? {
                        background: 'linear-gradient(135deg, #26316C, #1e2754)', color: 'white', border: 'none'
                      } : {
                        background: 'rgba(255,255,255,0.5)', color: '#26316C', border: '1px solid rgba(0,0,0,0.1)'
                      }}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-primary/80 uppercase tracking-wider">Amount Received</label>
                <input 
                  type="number" 
                  autoFocus
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full h-14 px-4 text-2xl font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-center transition-all"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}
                />
              </div>

              {amountPaid >= grandTotal && (
                <div className="flex justify-between items-center p-4 rounded-xl bg-green-50 border border-green-200 text-green-700">
                  <span className="font-bold">Change Due</span>
                  <span className="text-2xl font-black">{currencySymbol}{(amountPaid - grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button 
                onClick={() => setShowPayment(false)}
                className="flex-1 h-14 rounded-full font-bold transition-all btn-secondary"
              >
                Cancel
              </button>
              <button 
                id="confirm-payment-btn"
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'Cash' && amountPaid < grandTotal)}
                className="flex-[2] h-14 rounded-full font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 btn-primary"
              >
                {isProcessing ? 'Processing...' : `Confirm Payment ${settings?.shortcut_print ? `(${settings.shortcut_print})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {showHeldBills && (
        <div className="absolute inset-0 rounded-b-xl flex items-center justify-center z-[100] fade-in-up bg-black/20 backdrop-blur-sm">
          <div className="p-8 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col bg-white border border-border shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-4 border-b border-border pb-4 text-foreground">Recall Held Bills</h2>
            <div className="flex-1 overflow-auto custom-scrollbar pr-2 mt-2">
              {heldBills.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-medium">No held bills found.</div>
              ) : (
                <div className="grid gap-3">
                  {heldBills.map((bill) => (
                    <div key={bill.id} className="rounded-xl p-4 flex justify-between items-center transition-all bg-muted/20 border border-border">
                      <div>
                        <div className="font-bold text-foreground">{bill.date}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">
                          {bill.cart.length} items · Customer: {bill.customer ? bill.customer.name : 'Walk-in'}
                        </div>
                        <div className="text-sm font-bold text-foreground mt-2">
                          Total: {currencySymbol}{Number(bill.grandTotal).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRecallBill(bill.id)}
                          className="px-6 py-2.5 rounded-full font-bold transition-all btn-primary"
                        >
                          Recall
                        </button>
                        <button 
                          onClick={() => {
                            const updated = heldBills.filter(b => b.id !== bill.id);
                            setHeldBills(updated);
                            localStorage.setItem('held_bills', JSON.stringify(updated));
                          }}
                          className="px-4 py-2.5 rounded-full font-bold transition-all bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 pt-4 border-t border-border flex justify-end">
              <button 
                onClick={() => setShowHeldBills(false)}
                className="px-6 h-12 rounded-full font-bold transition-all btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {showNewCustomer && (
        <div className="absolute inset-0 rounded-b-xl flex items-center justify-center z-[110] fade-in-up bg-black/20 backdrop-blur-sm">
          <div className="p-8 rounded-3xl w-full max-w-sm bg-white border border-border shadow-2xl relative">
            <h2 className="text-2xl font-bold mb-6 text-center text-foreground">New Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/80">Name *</label>
                <input 
                  type="text" required autoFocus
                  value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 text-sm font-semibold bg-muted/20"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-foreground/80">Phone</label>
                <input 
                  type="text" 
                  value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-border focus:ring-2 focus:ring-primary/50 text-sm font-semibold bg-muted/20"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <button type="button" onClick={() => setShowNewCustomer(false)} className="flex-1 h-12 rounded-full font-bold btn-secondary">Cancel</button>
                <button type="submit" className="flex-1 h-12 rounded-full font-bold btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b bg-muted/30">
              <h3 className="font-bold text-lg leading-tight">{editingItem.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">SKU: {editingItem.sku}</p>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Quantity</label>
                <div className="relative">
                  <input
                    ref={qtyInputRef}
                    type="number"
                    min="1"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value) || 1})}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveItem();
                      }
                    }}
                    className="w-full h-12 text-lg font-bold px-4 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Unit Price</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-muted-foreground font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.selling_price}
                      onChange={(e) => setEditingItem({...editingItem, selling_price: Number(e.target.value) || 0})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveItem();
                        }
                      }}
                      className="w-full h-12 text-base font-bold pl-8 pr-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Discount</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-muted-foreground font-medium">{currencySymbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingItem.discount}
                      onChange={(e) => setEditingItem({...editingItem, discount: Number(e.target.value) || 0})}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveItem();
                        }
                      }}
                      className="w-full h-12 text-base font-bold pl-8 pr-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t flex gap-3">
              <button 
                onClick={() => setEditingItem(null)}
                className="flex-1 h-11 bg-white text-muted-foreground border font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveItem}
                className="flex-[2] h-11 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                Save Item (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;

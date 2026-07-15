import { useDialogStore } from '../store/dialogStore';
import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Banknote, Trash2, Star } from 'lucide-react';
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
  
  // Payment Modal State
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Held Bills State
  const [showHeldBills, setShowHeldBills] = useState(false);
  const [heldBills, setHeldBills] = useState<any[]>([]);
  
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
    
    // Global Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
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
        if (cart.length > 0) setShowPayment(true);
      } else if (e.key === 'Escape') {
        setShowPayment(false);
        setShowHeldBills(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    // Load held bills
    const saved = localStorage.getItem('held_bills');
    if (saved) setHeldBills(JSON.parse(saved));

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, customer, globalDiscount, loyaltyPointsUsed]);

  useEffect(() => {
    if (searchInput.trim() === '') {
      setFilteredProducts([]);
      return;
    }
    
    const query = searchInput.toLowerCase();
    const matches = products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.barcode && p.barcode.includes(query)) || 
      (p.sku && p.sku.toLowerCase().includes(query))
    );
    
    // Barcode scanner simulation: if it's an exact match on barcode and entered quickly, auto-add
    // Real barcode scanners act as a fast keyboard that ends with 'Enter'
    setFilteredProducts(matches);
    setSearchIndex(-1); // reset selection on new search
  }, [searchInput, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchIndex >= 0 ? filteredProducts[searchIndex] : filteredProducts[0];
    if (target) {
      addToCart(target);
      setSearchInput('');
      setSearchIndex(-1);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSearchIndex(i => Math.min(i + 1, filteredProducts.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSearchIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Escape') {
      setSearchInput('');
      setSearchIndex(-1);
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
        addToCart(item);
        // Wait, addToCart sets quantity to 1. We need to update it.
        updateCartItem(item.id, { quantity: item.quantity, discount: item.discount });
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
          
          await (window as any).electronAPI.printReceipt(fullHtml, '80mm');
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
            currencySymbol={currencySymbol}
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
          
          {/* Autocomplete dropdown */}
          {filteredProducts.length > 0 && searchInput && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-xl max-h-64 overflow-auto custom-scrollbar">
              <div style={{ padding: '4px' }}>
                {filteredProducts.map((p, idx) => (
                  <div 
                    key={p.id} 
                    className="p-2.5 cursor-pointer flex justify-between items-center rounded-lg transition-all"
                    style={{
                      background: idx === searchIndex ? '#F1F5F9' : 'transparent',
                      borderLeft: idx === searchIndex ? '3px solid #2B6BF3' : '3px solid transparent',
                    }}
                    onMouseEnter={() => setSearchIndex(idx)}
                    onMouseLeave={() => setSearchIndex(-1)}
                    onClick={() => { addToCart(p); setSearchInput(''); setSearchIndex(-1); }}
                  >
                    <div>
                      <div className="font-semibold text-xs text-foreground">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">SKU: {p.sku} · {p.barcode}</div>
                    </div>
                    <div className="font-bold text-foreground text-sm shrink-0 ml-2">
                      {currencySymbol}{Number(p.selling_price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '4px 10px 6px', borderTop: '1px solid rgba(38,49,108,0.07)', fontSize: 9, color: '#aaa' }}>
                ↑↓ navigate · Enter to add · Esc to close
              </div>
            </div>
          )}
        </form>
        
        {/* Visual Product Grid */}
        <div className="flex-1 rounded-2xl overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start">
          {products.map((p) => (
            <div 
              key={p.id}
              onClick={() => addToCart(p)}
              className="glass-card p-3 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] flex flex-col gap-2"
            >
              <div className="aspect-[4/3] rounded-xl flex flex-col items-center justify-center text-center p-2 mb-1 bg-muted/50 border border-border/50">
                {/* Fallback Icon */}
                <div className="text-3xl opacity-80 drop-shadow-sm">📦</div>
                <div className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">{p.sku}</div>
              </div>
              <div className="flex-1 flex flex-col justify-end">
                <div className="font-semibold text-xs leading-tight line-clamp-2 text-foreground/90">{p.name}</div>
                <div className="font-bold text-sm mt-1 text-foreground">{currencySymbol}{Number(p.selling_price).toFixed(2)}</div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-12">
              <p>No products available</p>
            </div>
          )}
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
                <div key={item.id} className="p-2.5 rounded-xl flex gap-3 items-center relative group transition-all hover:bg-muted/30 border border-transparent hover:border-border">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm leading-tight line-clamp-2 text-foreground/90">{item.name}</div>
                    <div className="text-[11px] font-bold mt-1 text-foreground">{currencySymbol}{Number(item.selling_price).toFixed(2)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="font-bold text-sm text-foreground">{currencySymbol}{item.subtotal.toFixed(2)}</div>
                    <div className="flex items-center bg-muted/50 rounded-full border border-border p-0.5">
                      <button onClick={() => updateCartItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-lg font-medium text-foreground">-</button>
                      <span className="w-6 text-center font-bold text-xs text-foreground">{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.id, { quantity: item.quantity + 1 })} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white text-lg font-medium text-foreground">+</button>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
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
        <div className="rounded-2xl p-4 flex flex-col justify-center shrink-0 bg-white border border-border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold flex items-center text-xs tracking-wide text-foreground/80">
              <UserPlus className="h-4 w-4 mr-1.5" /> CUSTOMER
            </h3>
            <button 
              onClick={() => setShowNewCustomer(true)}
              className="text-[10px] uppercase font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded"
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
              className="w-full h-11 px-3 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-semibold transition-shadow bg-muted/20 text-foreground"
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
        <div className="rounded-3xl p-5 flex flex-col shrink-0 bg-gradient-to-br from-primary/5 to-transparent border border-primary/10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
          
          <div className="space-y-4 font-semibold text-foreground relative z-10">
            <div className="flex justify-between items-center opacity-90 text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-bold text-lg">{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold opacity-90 flex items-center text-muted-foreground">
                Discount 
                {customer?.rating && customer.rating !== 'Standard' && (
                  <span className="ml-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <Star className="h-2.5 w-2.5 fill-current" /> {customer.rating} (-{usePosStore.getState().customerDiscountPercentage}%)
                  </span>
                )}
              </span>
              <div className="flex items-center">
                <span className="mr-2 text-muted-foreground font-bold">{currencySymbol}</span>
                <input 
                  type="number" min="0" step="0.01" value={globalDiscount || ''}
                  placeholder="0.00"
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-9 text-right rounded-xl focus:ring-2 focus:ring-primary/50 px-2 font-bold text-lg transition-all border border-border bg-white shadow-inner text-primary" 
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10">
              <div className="flex justify-between items-center opacity-90 text-sm">
                <span className="text-primary/80 font-bold flex flex-col">
                  <span>Pay with Points</span>
                  <span className="text-[10px] opacity-70">(1pt = {currencySymbol}{settings?.loyalty_point_value || 1})</span>
                </span>
                <div className="flex items-center">
                  <span className="mr-2 text-primary font-bold text-xs bg-primary/10 px-2 py-1 rounded-md">PTS</span>
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
                    className="w-24 h-9 text-right rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 px-2 font-bold transition-all disabled:opacity-40 border border-primary/20 bg-white shadow-sm text-primary" 
                  />
                </div>
              </div>
              {customer && customer.loyalty_points < parseInt(settings?.loyalty_min_redeem || '0') && (
                <div className="text-[10px] text-orange-500 font-bold bg-orange-500/10 px-2 py-1 rounded w-fit">
                  Min redeemable: {settings?.loyalty_min_redeem} pts
                </div>
              )}
            </div>
          </div>
          
          <div className="border-t-2 border-dashed border-primary/20 pt-4 mt-4 flex justify-between items-end relative z-10">
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-widest text-primary/70">GRAND TOTAL</span>
              <span className="text-[10px] text-muted-foreground uppercase mt-0.5">Includes Tax</span>
            </div>
            <span className="text-4xl font-black text-primary tracking-tight">{currencySymbol}{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          <button onClick={handleHoldBill} className="h-10 rounded-full font-semibold transition-all hover:scale-[0.97] bg-blue-50 text-blue-600 text-xs border border-blue-100">
            Hold
          </button>
          <button onClick={() => setShowHeldBills(true)} className="h-10 rounded-full font-semibold transition-all hover:scale-[0.97] bg-orange-50 text-orange-600 text-xs border border-orange-100">
            Recall
          </button>
          <button onClick={() => { setShowPayment(false); setShowHeldBills(false); }} className="h-10 rounded-full font-semibold transition-all hover:scale-[0.97] bg-red-50 text-red-600 text-xs border border-red-100">
            Cancel
          </button>
          
          <button 
            onClick={() => {
              if (cart.length > 0) {
                setAmountPaid(grandTotal);
                setShowPayment(true);
              }
            }}
            disabled={cart.length === 0}
            className="h-14 rounded-full font-bold text-lg transition-all hover:scale-[0.98] flex items-center justify-center col-span-3 disabled:opacity-50 disabled:scale-100 btn-primary"
          >
            <Banknote className="h-5 w-5 mr-2" />
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
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'Cash' && amountPaid < grandTotal)}
                className="flex-[2] h-14 rounded-full font-bold text-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 btn-primary"
              >
                {isProcessing ? 'Processing...' : 'Confirm Payment'}
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
    </div>
  );
};

export default POS;

import { useDialogStore } from '../store/dialogStore';
import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Banknote, Trash2 } from 'lucide-react';
import { usePosStore, Product } from '../store/posStore';
import { renderToString } from 'react-dom/server';
import { Receipt80mm } from '../components/pos/Receipt';
import api from '../api/axios';
import { useSettingsStore } from '../store/settingsStore';

const POS = () => {
  const { 
    cart, products, fetchProducts, addToCart, removeFromCart, updateCartItem, 
    subtotal, totalTax, totalDiscount, grandTotal, processSale, clearCart
  } = usePosStore();
  
  const [searchInput, setSearchInput] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
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
  const { customer, setCustomer, globalDiscount, setGlobalDiscount, loyaltyPointsUsed, setLoyaltyPointsUsed } = usePosStore();
  const { currencySymbol } = useSettingsStore();
  
  useEffect(() => {
    // Fetch customers for the dropdown
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/customers');
        setCustomers(res.data);
      } catch (e) {
        console.error("Failed to fetch customers");
      }
    };
    fetchCustomers();
  }, []);

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
  }, [searchInput, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredProducts.length === 1) {
      addToCart(filteredProducts[0]);
      setSearchInput('');
    } else if (filteredProducts.length > 1) {
      // Could show a dropdown or modal for ambiguous search
      addToCart(filteredProducts[0]); // Just pick first for now for speed
      setSearchInput('');
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
    <div className="flex flex-1 gap-4 overflow-hidden">
      {/* Left side - Product Search and Cart */}
      <div className="flex-1 flex flex-col gap-4 relative">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <input 
            ref={searchInputRef}
            type="text" 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by Barcode, SKU, or Name (F1)" 
            className="w-full h-12 pl-10 pr-4 text-lg rounded-md border border-input bg-card focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
            autoFocus
          />
          
          {/* Autocomplete dropdown */}
          {filteredProducts.length > 0 && searchInput && (
            <div className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredProducts.map(p => (
                <div 
                  key={p.id} 
                  className="p-3 hover:bg-muted cursor-pointer flex justify-between border-b last:border-0"
                  onClick={() => { addToCart(p); setSearchInput(''); }}
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">SKU: {p.sku} | Barcode: {p.barcode}</div>
                  </div>
                  <div className="font-semibold text-primary">{currencySymbol}{Number(p.selling_price).toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </form>
        
        <div className="flex-1 border bg-card rounded-md shadow-sm overflow-hidden flex flex-col">
          <div className="bg-muted/50 p-3 border-b grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Product</div>
            <div className="col-span-2 text-center">Qty</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1 text-center" title="Discount">Disc</div>
            <div className="col-span-1 text-right">Total</div>
            <div className="col-span-1 text-center"></div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <Search className="h-16 w-16 mb-4" />
                <p className="text-lg">Scan barcode or search product</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={item.id} className="p-2 border-b grid grid-cols-12 gap-2 items-center hover:bg-muted/30">
                  <div className="col-span-1 text-muted-foreground">{idx + 1}</div>
                  <div className="col-span-4">
                    <div className="font-medium text-sm leading-tight truncate" title={item.name}>{item.name}</div>
                    <div className="text-xs text-muted-foreground">{item.barcode || item.sku}</div>
                  </div>
                  <div className="col-span-2 text-center flex items-center justify-center">
                    <input 
                      type="number" 
                      min="1"
                      className="w-14 h-8 text-center border rounded-md focus:ring-1 focus:ring-primary focus:outline-none bg-background" 
                      value={item.quantity}
                      onChange={(e) => updateCartItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="col-span-2 text-right">{currencySymbol}{Number(item.selling_price).toFixed(2)}</div>
                  <div className="col-span-1 flex justify-center">
                    <input 
                      type="number" 
                      min="0"
                      className="w-12 h-8 text-center border rounded-md focus:ring-1 focus:ring-primary focus:outline-none bg-background text-xs" 
                      value={item.discount || ''}
                      placeholder="0"
                      onChange={(e) => updateCartItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                      title="Discount Amount"
                    />
                  </div>
                  <div className="col-span-1 text-right font-semibold">{currencySymbol}{item.subtotal.toFixed(2)}</div>
                  <div className="col-span-1 text-center">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right side - Order Summary & Actions */}
      <div className="w-[350px] flex flex-col gap-4">
        {/* Customer Selection */}
        <div className="border bg-card rounded-md shadow-sm p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center"><UserPlus className="h-4 w-4 mr-2" /> Customer</h3>
          </div>
          <select 
            value={customer?.id || ''} 
            onChange={(e) => {
              const cust = customers.find(c => c.id.toString() === e.target.value);
              setCustomer(cust || null);
              setLoyaltyPointsUsed(0); // Reset points when changing customer
            }}
            className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">Walk-in Customer</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
            ))}
          </select>
          {customer && (
            <div className="mt-3 p-2 bg-muted/50 rounded flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Loyalty Points Balance:</span>
              <span className="font-bold text-primary">{customer.loyalty_points || 0}</span>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="border bg-card rounded-md shadow-sm p-4 flex-1 flex flex-col">
          <h3 className="font-semibold mb-4 border-b pb-2">Order Summary</h3>
          
          <div className="space-y-3 flex-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            
            {/* Global Discount Input */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Discount ({currencySymbol})</span>
              <input 
                type="number" 
                min="0"
                step="0.01"
                value={globalDiscount || ''}
                onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                className="w-20 h-7 text-right border rounded focus:ring-1 focus:ring-primary bg-background px-1" 
              />
            </div>

            {/* Loyalty Points Input */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Apply Points (1 pt = $1)</span>
              <input 
                type="number" 
                min="0"
                max={customer?.loyalty_points || 0}
                value={loyaltyPointsUsed || ''}
                onChange={(e) => {
                  let val = parseInt(e.target.value) || 0;
                  if (val > (customer?.loyalty_points || 0)) val = customer?.loyalty_points || 0;
                  setLoyaltyPointsUsed(val);
                }}
                disabled={!customer}
                className="w-20 h-7 text-right border rounded focus:ring-1 focus:ring-primary bg-background px-1 disabled:opacity-50" 
              />
            </div>

            <div className="flex justify-between text-muted-foreground">
              <span>Tax (0%)</span>
              <span>{currencySymbol}{totalTax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="border-t pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="text-3xl font-bold text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>
            {customer && (
              <div className="text-right text-xs text-green-600 font-medium">
                + Earns {Math.floor(grandTotal / 100)} Points
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={handleHoldBill} className="h-14 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-md font-medium hover:bg-blue-500 hover:text-white transition-colors flex flex-col items-center justify-center">
            <span className="text-xs mb-1">F3</span> Hold Bill
          </button>
          <button onClick={() => setShowHeldBills(true)} className="h-14 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-md font-medium hover:bg-orange-500 hover:text-white transition-colors flex flex-col items-center justify-center">
            <span className="text-xs mb-1">F4</span> Recall Bill
          </button>
          <button 
            onClick={() => {
              if (cart.length > 0) {
                setAmountPaid(grandTotal);
                setShowPayment(true);
              }
            }}
            disabled={cart.length === 0}
            className="h-20 bg-green-600 text-white rounded-md font-bold text-lg hover:bg-green-700 transition-colors flex flex-col items-center justify-center col-span-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Banknote className="h-6 w-6 mb-1" />
            Pay / Complete (Ctrl+S)
          </button>
          <button 
            onClick={() => {
              setShowPayment(false);
              setShowHeldBills(false);
            }}
            className="h-14 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md font-medium hover:bg-red-500 hover:text-white transition-colors flex flex-col items-center justify-center">
            <span className="text-xs mb-1">Esc</span> Cancel
          </button>
          <button 
            onClick={clearCart}
            className="h-14 bg-muted text-muted-foreground border border-border rounded-md font-medium hover:bg-muted-foreground hover:text-background transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-xs mb-1">F8</span> New Bill
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Complete Payment</h2>
            
            <div className="mb-6 p-4 bg-muted rounded-lg flex justify-between items-center">
              <span className="font-semibold text-lg">Total Due:</span>
              <span className="text-3xl font-bold text-primary">{currencySymbol}{grandTotal.toFixed(2)}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Cash', 'Card', 'QR'].map(method => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`h-10 rounded-md border font-medium ${paymentMethod === method ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount Received</label>
                <input 
                  type="number" 
                  autoFocus
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full h-12 px-3 text-xl font-bold rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {amountPaid >= grandTotal && (
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border">
                  <span className="text-muted-foreground">Change Due</span>
                  <span className="text-xl font-bold">{currencySymbol}{(amountPaid - grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowPayment(false)}
                className="flex-1 h-12 bg-muted text-muted-foreground rounded-md font-medium hover:bg-muted-foreground hover:text-background transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckout}
                disabled={isProcessing || (paymentMethod === 'Cash' && amountPaid < grandTotal)}
                className="flex-1 h-12 bg-green-600 text-white rounded-md font-bold text-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {showHeldBills && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Held Bills</h2>
            <div className="flex-1 overflow-auto custom-scrollbar">
              {heldBills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No held bills found.</div>
              ) : (
                <div className="grid gap-4">
                  {heldBills.map((bill) => (
                    <div key={bill.id} className="border rounded-lg p-4 flex justify-between items-center hover:border-primary/50 transition-colors">
                      <div>
                        <div className="font-semibold">{bill.date}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {bill.cart.length} items | Customer: {bill.customer ? bill.customer.name : 'Walk-in'}
                        </div>
                        <div className="text-sm font-bold text-primary mt-1">
                          Total: {currencySymbol}{Number(bill.grandTotal).toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRecallBill(bill.id)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 font-medium"
                        >
                          Recall
                        </button>
                        <button 
                          onClick={() => {
                            const updated = heldBills.filter(b => b.id !== bill.id);
                            setHeldBills(updated);
                            localStorage.setItem('held_bills', JSON.stringify(updated));
                          }}
                          className="px-3 py-2 bg-destructive/10 text-destructive rounded hover:bg-destructive hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t flex justify-end">
              <button 
                onClick={() => setShowHeldBills(false)}
                className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted-foreground hover:text-background"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;

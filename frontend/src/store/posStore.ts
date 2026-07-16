import { create } from 'zustand';
import { useSettingsStore } from './settingsStore';
import api from '../api/axios';

export interface Product {
  id: number;
  barcode: string;
  sku: string;
  name: string;
  selling_price: number;
  stock: number;
  is_service: boolean;
  category_id?: number | null;
  total_sold?: number;
  materials?: { material_id: number; quantity: number }[];
}

export interface CartItem extends Product {
  quantity: number;
  discount: number;
  subtotal: number;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  loyalty_points: number;
  rating?: 'Standard' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  total_purchases?: number;
}

interface PosState {
  cart: CartItem[];
  products: Product[];
  customer: Customer | null;
  taxRate: number;
  globalDiscount: number;
  customerDiscountPercentage: number;
  loyaltyPointsUsed: number;
  searchQuery: string;
  
  // Computed (these can be derived, but good to have explicit actions)
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  
  // Actions
  fetchProducts: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setCustomer: (customer: Customer | null) => void;
  addToCart: (product: Product, qty?: number, priceOverride?: number, discount?: number) => void;
  updateCartItem: (productId: number, updates: Partial<CartItem>) => void;
  removeFromCart: (productId: number) => void;
  setGlobalDiscount: (amount: number) => void;
  setCustomerDiscountPercentage: (pct: number) => void;
  setLoyaltyPointsUsed: (points: number) => void;
  clearCart: () => void;
  calculateTotals: () => void;
  processSale: (paymentMethod: string, amountPaid: number) => Promise<any>;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  products: [],
  customer: null,
  taxRate: 0, // Should be loaded from settings
  globalDiscount: 0,
  customerDiscountPercentage: 0,
  loyaltyPointsUsed: 0,
  searchQuery: '',
  subtotal: 0,
  totalTax: 0,
  totalDiscount: 0,
  grandTotal: 0,

  fetchProducts: async () => {
    try {
      const response = await api.get('/products');
      set({ products: response.data });
    } catch (error) {
      console.error('Failed to fetch products', error);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setCustomer: (customer) => {
    let customerDiscountPercentage = 0;
    if (customer?.rating) {
      switch (customer.rating) {
        case 'Bronze': customerDiscountPercentage = 2; break;
        case 'Silver': customerDiscountPercentage = 5; break;
        case 'Gold': customerDiscountPercentage = 10; break;
        case 'Platinum': customerDiscountPercentage = 15; break;
        default: customerDiscountPercentage = 0; break;
      }
    }
    set({ customer, customerDiscountPercentage });
    get().calculateTotals();
  },

  calculateTotals: () => {
    const { cart, taxRate, globalDiscount, customerDiscountPercentage, loyaltyPointsUsed } = get();
    const settings = useSettingsStore.getState().settings;
    const pointValue = settings?.loyalty_point_value ? parseFloat(settings.loyalty_point_value) : 1;
    
    let newSubtotal = 0;
    
    cart.forEach(item => {
      newSubtotal += item.subtotal;
    });

    const newTax = newSubtotal * (taxRate / 100);
    const ratingDiscount = newSubtotal * (customerDiscountPercentage / 100);
    const loyaltyDiscount = loyaltyPointsUsed * pointValue;
    const newGrandTotal = newSubtotal + newTax - globalDiscount - ratingDiscount - loyaltyDiscount;

    set({
      subtotal: newSubtotal,
      totalTax: newTax,
      totalDiscount: globalDiscount + ratingDiscount + loyaltyDiscount,
      grandTotal: newGrandTotal > 0 ? newGrandTotal : 0
    });
  },

  addToCart: (product, qty = 1, priceOverride, discount = 0) => {
    const { cart, calculateTotals } = get();
    const existingItemIndex = cart.findIndex(item => item.id === product.id);

    const price = priceOverride !== undefined ? priceOverride : product.selling_price;

    if (existingItemIndex >= 0) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingItemIndex].quantity + qty;
      updatedCart[existingItemIndex].quantity = newQty;
      if (priceOverride !== undefined) {
        updatedCart[existingItemIndex].selling_price = price;
      }
      updatedCart[existingItemIndex].discount += discount;
      updatedCart[existingItemIndex].subtotal = (newQty * updatedCart[existingItemIndex].selling_price) - updatedCart[existingItemIndex].discount;
      set({ cart: updatedCart });
    } else {
      const newItem: CartItem = {
        ...product,
        selling_price: price,
        quantity: qty,
        discount: discount,
        subtotal: (price * qty) - discount
      };
      set({ cart: [...cart, newItem] });
    }
    calculateTotals();
  },

  updateCartItem: (productId, updates) => {
    const { cart, calculateTotals } = get();
    const updatedCart = cart.map(item => {
      if (item.id === productId) {
        const updatedItem = { ...item, ...updates };
        updatedItem.subtotal = (updatedItem.quantity * updatedItem.selling_price) - updatedItem.discount;
        return updatedItem;
      }
      return item;
    });
    set({ cart: updatedCart });
    calculateTotals();
  },

  removeFromCart: (productId) => {
    const { cart, calculateTotals } = get();
    set({ cart: cart.filter(item => item.id !== productId) });
    calculateTotals();
  },

  setGlobalDiscount: (amount) => {
    set({ globalDiscount: amount });
    get().calculateTotals();
  },

  setCustomerDiscountPercentage: (pct) => {
    set({ customerDiscountPercentage: pct });
    get().calculateTotals();
  },

  setLoyaltyPointsUsed: (points) => {
    set({ loyaltyPointsUsed: points });
    get().calculateTotals();
  },

  clearCart: () => {
    set({ cart: [], customer: null, globalDiscount: 0, loyaltyPointsUsed: 0, searchQuery: '' });
    get().calculateTotals();
  },

  processSale: async (paymentMethod, amountPaid) => {
    const state = get();
    
    if (state.cart.length === 0) throw new Error("Cart is empty");

    const payload = {
      customer_id: state.customer?.id || null,
      subtotal: state.subtotal,
      discount: state.totalDiscount,
      tax: state.totalTax,
      total_amount: state.grandTotal,
      payment_method: paymentMethod,
      amount_paid: amountPaid,
      loyalty_points_used: state.loyaltyPointsUsed,
      loyalty_points_earned: Math.floor(state.grandTotal / 100), // Earn 1 point per $100 spent
      status: 'Completed',
      items: state.cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.selling_price,
        discount: item.discount,
        subtotal: item.subtotal,
        is_service: item.is_service
      }))
    };

    const response = await api.post('/sales', payload);
    state.clearCart();
    return response.data; // Includes sale_id and invoice_number for printing
  }
}));

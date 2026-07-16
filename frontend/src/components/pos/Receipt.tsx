import { forwardRef } from 'react';

export interface ReceiptProps {
  invoiceNumber: string;
  cashierName: string;
  date: string;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  paymentMethod: string;
  companyName?: string;
  companyAddress?: string;
  footerMessage?: string;
  currencySymbol?: string;
  companyLogo?: string;
}

export const Receipt80mm = forwardRef<HTMLDivElement, ReceiptProps>(({
  invoiceNumber, cashierName, date, items, subtotal, discount, tax, total, amountPaid, paymentMethod,
  companyName = "Enterprise Stationery",
  companyAddress = "123 Business St, Tech City",
  footerMessage = "Thank you for your business!",
  currencySymbol = "$",
  companyLogo
}, ref) => {
  return (
    <div ref={ref} className="w-[80mm] p-4 text-black bg-white font-mono text-sm leading-tight mx-auto border" style={{ printColorAdjust: 'exact' }}>
      {/* Header */}
      <div className="text-center mb-4">
        {companyLogo && (
          <img src={companyLogo} alt="Logo" className="max-h-16 mx-auto mb-2" style={{ objectFit: 'contain' }} />
        )}
        <h1 className="text-xl font-bold mb-1">{companyName}</h1>
        <p className="text-xs">{companyAddress}</p>
      </div>

      {/* Meta Info */}
      <div className="mb-4 text-xs border-b border-black pb-2 border-dashed">
        <div className="flex justify-between"><span>Inv:</span> <span>{invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span> <span>{date}</span></div>
        <div className="flex justify-between"><span>Cashier:</span> <span>{cashierName}</span></div>
      </div>

      {/* Items Header */}
      <div className="flex justify-between text-xs font-bold border-b border-black pb-1 mb-2">
        <span className="w-1/2">Item</span>
        <span className="w-1/6 text-center">Qty</span>
        <span className="w-1/3 text-right">Total</span>
      </div>

      {/* Items List */}
      <div className="mb-4 min-h-[50px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-xs mb-1">
            <span className="w-1/2 truncate">{item.name}</span>
            <span className="w-1/6 text-center">{item.quantity}</span>
            <span className="w-1/3 text-right">{currencySymbol}{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-black pt-2 border-dashed text-xs space-y-1">
        <div className="flex justify-between"><span>Subtotal:</span> <span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Discount:</span> <span>{currencySymbol}{discount.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax:</span> <span>{currencySymbol}{tax.toFixed(2)}</span></div>
        <div className="flex justify-between font-bold text-sm mt-1 border-t border-black pt-1">
          <span>TOTAL:</span> <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mt-4 text-xs">
        <div className="flex justify-between"><span>Method:</span> <span>{paymentMethod}</span></div>
        <div className="flex justify-between"><span>Tendered:</span> <span>{currencySymbol}{amountPaid.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Change:</span> <span>{currencySymbol}{(amountPaid - total > 0 ? amountPaid - total : 0).toFixed(2)}</span></div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs font-bold">
        <p>{footerMessage}</p>
        <p className="mt-2 text-[10px] font-normal">Powered by EPOS</p>
      </div>
    </div>
  );
});

Receipt80mm.displayName = 'Receipt80mm';

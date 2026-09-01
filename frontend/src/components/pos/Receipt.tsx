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
  companyPhone?: string;
  customerName?: string;
  footerMessage?: string;
  currencySymbol?: string;
  companyLogo?: string;
}

export const Receipt80mm = forwardRef<HTMLDivElement, ReceiptProps>(({
  invoiceNumber, cashierName, date, items, subtotal, discount, tax, total, amountPaid, paymentMethod,
  companyName = "Enterprise Stationery",
  companyAddress = "123 Business St, Tech City",
  companyPhone,
  customerName,
  footerMessage = "Thank you for your business!",
  currencySymbol = "$",
  companyLogo
}, ref) => {
  return (
    <div ref={ref} className="w-[80mm] p-4 text-black bg-white font-mono text-[15px] leading-snug mx-auto border" style={{ printColorAdjust: 'exact' }}>
      {/* Header */}
      <div className="text-center mb-4">
        {companyLogo && (
          <img src={companyLogo} alt="Logo" className="max-h-12 mx-auto mb-2" style={{ objectFit: 'contain' }} />
        )}
        <h1 className="text-2xl font-extrabold mb-1">{companyName}</h1>
        {companyAddress && <p className="text-[15px]">{companyAddress}</p>}
        {companyPhone && <p className="text-[15px]">Tel: {companyPhone}</p>}
      </div>

      {/* Meta Info */}
      <div className="mb-4 text-[15px] border-b border-black pb-2 border-dashed">
        <div className="flex justify-between"><span>Inv:</span> <span>{invoiceNumber}</span></div>
        <div className="flex justify-between"><span>Date:</span> <span>{date}</span></div>
        <div className="flex justify-between"><span>Cashier:</span> <span>{cashierName}</span></div>
        {customerName && <div className="flex justify-between"><span>Customer:</span> <span className="font-extrabold text-right max-w-[60%]">{customerName}</span></div>}
      </div>

      {/* Items Header */}
      <div className="flex justify-between text-[15px] font-bold border-b border-black pb-1 mb-2">
        <span className="w-1/2">Item</span>
        <span className="w-1/6 text-center">Qty</span>
        <span className="w-1/3 text-right">Total</span>
      </div>

      {/* Items List */}
      <div className="mb-4 min-h-[50px]">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-[15px] mb-2">
            <span className="w-1/2 pr-2" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{item.name}</span>
            <span className="w-1/6 text-center">{item.quantity}</span>
            <span className="w-1/3 text-right">{currencySymbol}{item.subtotal.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-black pt-2 border-dashed text-[15px] space-y-1">
        <div className="flex justify-between"><span>Subtotal:</span> <span>{currencySymbol}{subtotal.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Discount:</span> <span>{currencySymbol}{discount.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Tax:</span> <span>{currencySymbol}{tax.toFixed(2)}</span></div>
        <div className="flex justify-between font-extrabold text-xl mt-2 border-t-2 border-black pt-2">
          <span>TOTAL:</span> <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Payment Details */}
      <div className="mt-4 text-[15px]">
        <div className="flex justify-between"><span>Method:</span> <span>{paymentMethod}</span></div>
        <div className="flex justify-between"><span>Tendered:</span> <span>{currencySymbol}{amountPaid.toFixed(2)}</span></div>
        <div className="flex justify-between"><span>Change:</span> <span>{currencySymbol}{(amountPaid - total > 0 ? amountPaid - total : 0).toFixed(2)}</span></div>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-[15px]">
        <p>{footerMessage}</p>
        <p className="mt-2 text-[12px] font-normal">Powered by EPOS</p>
      </div>
    </div>
  );
});

Receipt80mm.displayName = 'Receipt80mm';

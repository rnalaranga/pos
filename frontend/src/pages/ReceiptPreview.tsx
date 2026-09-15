import { useState, useEffect } from 'react';
import { useDialogStore } from '../store/dialogStore';
import { Printer } from 'lucide-react';
import api from '../api/axios';
import { renderToString } from 'react-dom/server';
import { Receipt80mm } from '../components/pos/Receipt';
import { useWindowStore } from '../store/windowStore';

export default function ReceiptPreview({ win }: { win?: any }) {
  const { closeWindow } = useWindowStore();
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [settingsMap, setSettingsMap] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const saleId = win?.payload?.saleId;

  useEffect(() => {
    if (!saleId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sRes, stRes] = await Promise.all([
          api.get(`/sales/${saleId}`),
          api.get('/settings')
        ]);
        setSettingsMap(stRes.data);
        setPreviewData(sRes.data);
      } catch (err) {
        useDialogStore.getState().alert('Error', 'Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [saleId]);

  const handlePrintReceipt = () => {
    if (!previewData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = renderToString(
      <Receipt80mm
        invoiceNumber={previewData.invoice_number}
        cashierName={previewData.cashier_name || 'System'}
        date={new Date(previewData.created_at).toLocaleString()}
        items={previewData.items.map((i: any) => ({
          name: i.product_name, quantity: i.quantity,
          unit_price: parseFloat(i.unit_price), subtotal: parseFloat(i.subtotal),
        }))}
        subtotal={parseFloat(previewData.subtotal)}
        discount={parseFloat(previewData.discount)}
        tax={parseFloat(previewData.tax)}
        total={parseFloat(previewData.total_amount)}
        amountPaid={parseFloat(previewData.amount_paid)}
        paymentMethod={previewData.payment_method}
        companyName={settingsMap.company_name}
        companyAddress={settingsMap.company_address}
        companyPhone={settingsMap.company_phone}
        customerName={previewData.customer_name || 'Walk-in'}
        footerMessage={settingsMap.receipt_footer}
        currencySymbol={settingsMap.currency_symbol || 'Rs.'}
        companyLogo={settingsMap.company_logo}
      />
    );
    printWindow.document.write(`<html><head><title>Receipt ${previewData.invoice_number}</title>
      <style>body{margin:0;padding:0;font-family:monospace;}
      .flex{display:flex;}.justify-between{justify-content:space-between;}
      .text-center{text-align:center;}.text-right{text-align:right;}
      .font-bold{font-weight:bold;}.font-extrabold{font-weight:900;}
      .w-1\\/2{width:50%;}.w-1\\/6{width:16.666%;}.w-1\\/3{width:33.333%;}
      .border-b{border-bottom:1px dashed #000;}.border-t{border-top:1px solid #000;}
      .mb-1{margin-bottom:4px;}.mb-2{margin-bottom:8px;}.mb-4{margin-bottom:16px;}
      .mt-2{margin-top:8px;}.mt-4{margin-top:16px;}.mt-6{margin-top:24px;}
      .pb-1{padding-bottom:4px;}.pb-2{padding-bottom:8px;}.pt-2{padding-top:8px;}
      .py-1{padding-top:4px;padding-bottom:4px;}.p-4{padding:16px;}
      .space-y-1>*+*{margin-top:4px;}
      .text-xl{font-size:18px;}.text-2xl{font-size:22px;}
      .border-t-2{border-top:2px solid #000;}.border-dashed{border-style:dashed;}
      .pr-2{padding-right:8px;}.text-xs{font-size:11px;}
      </style></head><body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  if (!saleId) return <div className="p-4 text-center text-slate-500">No sale ID provided.</div>;

  return (
    <div className="flex flex-col h-full items-center">
      <div className="flex-1 overflow-auto w-full flex flex-col items-center custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-slate-400">Loading receipt...</span>
          </div>
        ) : previewData ? (
          <div className="bg-white shadow-sm shrink-0 border border-slate-200 overflow-hidden flex justify-center w-[80mm] min-h-[100mm] mt-4 mb-8">
            <Receipt80mm 
              invoiceNumber={previewData.invoice_number}
              cashierName={previewData.cashier_name || 'System'}
              date={new Date(previewData.created_at).toLocaleString()}
              items={previewData.items.map((i: any) => ({
                name: i.product_name, quantity: i.quantity,
                unit_price: parseFloat(i.unit_price), subtotal: parseFloat(i.subtotal)
              }))}
              subtotal={parseFloat(previewData.subtotal)}
              discount={parseFloat(previewData.discount)}
              tax={parseFloat(previewData.tax)}
              total={parseFloat(previewData.total_amount)}
              amountPaid={parseFloat(previewData.amount_paid)}
              paymentMethod={previewData.payment_method}
              companyName={settingsMap.company_name}
              companyAddress={settingsMap.company_address}
              companyPhone={settingsMap.company_phone}
              customerName={previewData.customer_name || 'Walk-in'}
              footerMessage={settingsMap.receipt_footer}
              currencySymbol={settingsMap.currency_symbol || 'Rs.'}
              companyLogo={settingsMap.company_logo}
            />
          </div>
        ) : (
          <div className="py-20 text-slate-500">Failed to load receipt</div>
        )}
      </div>
      
      <div className="p-4 border-t border-slate-200 w-full flex justify-end gap-3 bg-white mt-auto shrink-0">
        <button onClick={() => win && closeWindow(win.id)} className="px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition-colors text-slate-600 border border-slate-300">
          Close
        </button>
        {previewData && (
          <button onClick={handlePrintReceipt} className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        )}
      </div>
    </div>
  );
}

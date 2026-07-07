import { useState, useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import api from '../../api/axios';
import { useSettingsStore } from '../../store/settingsStore';

interface GRNPreviewModalProps {
  grnId: number;
  onClose: () => void;
}

export default function GRNPreviewModal({ grnId, onClose }: GRNPreviewModalProps) {
  const [grn, setGrn] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { currencySymbol, settings } = useSettingsStore();

  useEffect(() => {
    const fetchGRN = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/grn/${grnId}`);
        setGrn(res.data);
      } catch (error) {
        console.error("Failed to load GRN details", error);
      } finally {
        setLoading(false);
      }
    };
    if (grnId) {
      fetchGRN();
    }
  }, [grnId]);

  const handlePrint = () => {
    if (!grn) return;
    
    const printHtml = `
      <html>
        <head>
          <title>GRN - ${grn.reference_number}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            .title { font-size: 20px; font-weight: bold; margin-top: 10px; }
            .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; }
            .info-col { width: 48%; }
            .info-row { display: flex; margin-bottom: 5px; }
            .info-label { font-weight: bold; width: 120px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }
            th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-row { font-weight: bold; font-size: 16px; }
            .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 12px; display: flex; justify-content: space-between; }
            .signature { width: 200px; border-top: 1px solid #000; text-align: center; padding-top: 5px; margin-top: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${settings.company_name || 'Enterprise POS'}</div>
            <div>${settings.company_address || ''}</div>
            <div>${settings.company_phone || ''}</div>
            <div class="title">GOODS RECEIVED NOTE</div>
          </div>
          
          <div class="info-grid">
            <div class="info-col">
              <div class="info-row"><div class="info-label">Supplier:</div><div>${grn.supplier_name}</div></div>
              <div class="info-row"><div class="info-label">Reference No:</div><div>${grn.reference_number}</div></div>
            </div>
            <div class="info-col">
              <div class="info-row"><div class="info-label">Date:</div><div>${new Date(grn.created_at).toLocaleString()}</div></div>
              <div class="info-row"><div class="info-label">Received By:</div><div>${grn.user_name}</div></div>
              <div class="info-row"><div class="info-label">Status:</div><div>${grn.status}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Product Description</th>
                <th class="text-center">Qty</th>
                <th class="text-right">Unit Cost (${currencySymbol})</th>
                <th class="text-right">Total (${currencySymbol})</th>
              </tr>
            </thead>
            <tbody>
              ${grn.items.map((item: any, idx: number) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>
                    <div>${item.product_name}</div>
                    <div style="font-size: 11px; color: #666;">SKU: ${item.sku}</div>
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${Number(item.purchase_price).toFixed(2)}</td>
                  <td class="text-right">${Number(item.total).toFixed(2)}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4" class="text-right">Grand Total:</td>
                <td class="text-right">${Number(grn.total_amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          ${grn.notes ? `
          <div style="margin-bottom: 20px;">
            <strong>Notes:</strong><br/>
            ${grn.notes}
          </div>
          ` : ''}

          <div style="display: flex; justify-content: space-between; margin-top: 60px;">
            <div class="signature">Supplier Signature</div>
            <div class="signature">Authorized Signature</div>
          </div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
      setTimeout(() => {
        win.print();
        win.close();
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-muted/30">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            GRN Details
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={handlePrint}
              disabled={loading || !grn}
              className="px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Print A4
            </button>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted text-muted-foreground rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="animate-pulse flex flex-col items-center">
                <FileText className="h-10 w-10 mb-4 opacity-50" />
                <p>Loading GRN details...</p>
              </div>
            </div>
          ) : !grn ? (
            <div className="text-center py-20 text-destructive">
              Failed to load GRN. It may have been deleted.
            </div>
          ) : (
            <div className="space-y-8">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Reference No</div>
                  <div className="font-bold text-lg">{grn.reference_number}</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Supplier</div>
                  <div className="font-bold text-lg truncate" title={grn.supplier_name}>{grn.supplier_name}</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border">
                  <div className="text-xs text-muted-foreground font-medium mb-1">Date</div>
                  <div className="font-bold">{new Date(grn.created_at).toLocaleDateString()}</div>
                  <div className="text-xs text-muted-foreground">{new Date(grn.created_at).toLocaleTimeString()}</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg border border-primary/20 bg-primary/5">
                  <div className="text-xs text-primary font-medium mb-1">Total Amount</div>
                  <div className="font-bold text-xl text-primary">{currencySymbol}{Number(grn.total_amount).toFixed(2)}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-bold text-lg mb-3 border-b pb-2">Received Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-center">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Cost</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {grn.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                          <td className="px-4 py-3 text-right">{currencySymbol}{Number(item.purchase_price).toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-semibold">{currencySymbol}{Number(item.total).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30 font-bold border-t-2">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right">Grand Total:</td>
                        <td className="px-4 py-3 text-right text-primary">{currencySymbol}{Number(grn.total_amount).toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {grn.notes && (
                <div>
                  <h3 className="font-bold text-sm mb-2 text-muted-foreground">Notes</h3>
                  <div className="bg-muted/30 p-4 rounded-lg border text-sm whitespace-pre-wrap">
                    {grn.notes}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
                <div>Created by: {grn.user_name}</div>
                <div>Status: <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-medium">{grn.status}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

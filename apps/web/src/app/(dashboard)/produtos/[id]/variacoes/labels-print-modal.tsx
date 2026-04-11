"use client";

import { useEffect, useState } from "react";
import { X, Printer, Loader2 } from "lucide-react";
import QRCode from "qrcode";

export type LabelVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  sale_price: string | null;
  quantity: number; // peças em estoque — define quantas etiquetas imprimir
};

type GeneratedLabel = { variant: LabelVariant; qrDataUrl: string };

type Props = {
  open: boolean;
  onClose: () => void;
  variants: LabelVariant[];
  productName: string;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function LabelsPrintModal({ open, onClose, variants, productName }: Props) {
  const [labels, setLabels] = useState<GeneratedLabel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || variants.length === 0) return;
    setLoading(true);
    setLabels([]);
    const origin = window.location.origin;
    Promise.all(
      variants.map(async (v) => {
        const qrDataUrl = await QRCode.toDataURL(`${origin}/q/${v.id}`, {
          width: 160,
          margin: 1,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        return { variant: v, qrDataUrl };
      }),
    ).then((result) => {
      setLabels(result);
      setLoading(false);
    });
  }, [open, variants]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;

    // Gera N cópias de cada etiqueta (uma por peça em estoque)
    const labelsHtml = labels
      .flatMap(({ variant, qrDataUrl }) => {
        const price = variant.sale_price
          ? `R$ ${Number(variant.sale_price).toFixed(2).replace(".", ",")}`
          : "";
        const label = `
        <div class="label">
          <div class="info">
            <p class="name">${escapeHtml(productName)}</p>
            <p class="variant">${escapeHtml(variant.color)} &middot; ${escapeHtml(variant.size)}</p>
            ${price ? `<p class="price">${price}</p>` : `<p class="price no-price">—</p>`}
            <p class="sku">${escapeHtml(variant.sku)}</p>
          </div>
          <div class="qr">
            <img src="${qrDataUrl}" width="108" height="108" />
          </div>
        </div>`;
        return Array.from({ length: variant.quantity }, () => label);
      })
      .join("");

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiquetas — ${escapeHtml(productName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: white; padding: 8mm; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4mm; }
    .label {
      border: 1.5px solid #cbd5e1;
      border-radius: 5px;
      padding: 4mm 4mm 4mm 5mm;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
      height: 44mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 1mm; }
    .name  { font-size: 10pt; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .variant { font-size: 8.5pt; color: #475569; }
    .price { font-size: 16pt; font-weight: 900; color: #0f172a; margin-top: 1mm; }
    .no-price { font-size: 9pt; font-weight: 400; color: #94a3b8; }
    .sku { font-family: "Courier New", monospace; font-size: 7pt; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .qr { flex-shrink: 0; }
    .qr img { display: block; }
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { padding: 8mm; }
    }
  </style>
</head>
<body>
  <div class="grid">${labelsHtml}</div>
  <script>window.onload = function () { window.print(); window.close(); };<\/script>
</body>
</html>`);
    win.document.close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        {(() => {
          const totalPecas = variants.reduce((s, v) => s + v.quantity, 0);
          return (
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Imprimir Etiquetas</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {variants.length} variação{variants.length !== 1 ? "ões" : ""} · <span className="font-semibold text-slate-600">{totalPecas} etiqueta{totalPecas !== 1 ? "s" : ""}</span> · {productName}
                </p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                <X size={18} />
              </button>
            </div>
          );
        })()}

        {/* Preview — 1 card por variação com badge de quantidade */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Gerando etiquetas...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {labels.map(({ variant, qrDataUrl }) => {
                const price = variant.sale_price
                  ? `R$ ${Number(variant.sale_price).toFixed(2).replace(".", ",")}`
                  : null;
                return (
                  <div
                    key={variant.id}
                    className="flex items-center gap-3 border border-slate-200 rounded-xl p-3 bg-white shadow-sm"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrDataUrl} alt={variant.sku} className="w-16 h-16 shrink-0 rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{productName}</p>
                      <p className="text-xs text-slate-500">{variant.color} · {variant.size}</p>
                      {price ? (
                        <p className="text-base font-black text-slate-900 mt-0.5">{price}</p>
                      ) : (
                        <p className="text-xs text-slate-300 mt-0.5">Sem preço</p>
                      )}
                      <p className="text-[10px] font-mono text-slate-400 truncate">{variant.sku}</p>
                    </div>
                    {/* Quantidade de etiquetas que serão impressas */}
                    <div className="shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-blue-50 border border-blue-100">
                      <span className="text-base font-black text-blue-600 leading-none">{variant.quantity}</span>
                      <span className="text-[9px] text-blue-400 leading-none mt-0.5">etiq.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {(() => {
          const totalPecas = variants.reduce((s, v) => s + v.quantity, 0);
          return (
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePrint}
                disabled={loading || labels.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white transition disabled:opacity-40"
              >
                <Printer size={14} />
                Imprimir {totalPecas} etiqueta{totalPecas !== 1 ? "s" : ""}
              </button>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

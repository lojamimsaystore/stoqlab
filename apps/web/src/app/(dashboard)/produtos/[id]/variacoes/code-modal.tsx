"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Printer } from "lucide-react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

type Props = {
  open: boolean;
  onClose: () => void;
  type: "qr" | "barcode";
  sku: string;
  label: string;
};

export function CodeModal({ open, onClose, type, sku, label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !sku) return;
    setDataUrl(null);

    if (type === "qr") {
      QRCode.toDataURL(sku, {
        width: 300,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      }).then(setDataUrl).catch(() => {});
    } else {
      // Barcode via canvas temporário
      const canvas = document.createElement("canvas");
      try {
        JsBarcode(canvas, sku, {
          format: "CODE128",
          width: 2.5,
          height: 80,
          displayValue: true,
          fontOptions: "bold",
          fontSize: 14,
          margin: 16,
          background: "#ffffff",
          lineColor: "#0f172a",
        });
        setDataUrl(canvas.toDataURL("image/png"));
      } catch {}
    }
  }, [open, type, sku]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${type === "qr" ? "qrcode" : "barcode"}-${sku}.png`;
    a.click();
  }

  function handlePrint() {
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>${label}</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;}
      img{max-width:300px;}p{font-size:14px;font-weight:600;color:#0f172a;margin-top:12px;}</style>
      </head><body>
      <img src="${dataUrl}" />
      <p>${label}</p>
      <script>window.onload=()=>{window.print();window.close();}<\/script>
      </body></html>
    `);
    win.document.close();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {type === "qr" ? "QR Code" : "Código de Barras"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {/* Code */}
        <div className="p-6 flex flex-col items-center gap-4">
          {dataUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt={sku}
                className="w-full rounded-lg border border-slate-100"
              />
              <p className="text-xs font-mono text-slate-500 text-center">{sku}</p>
            </>
          ) : (
            <div className="w-full h-40 flex items-center justify-center text-slate-300 text-sm">
              Gerando...
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-40"
          >
            <Download size={14} />
            Baixar
          </button>
          <button
            onClick={handlePrint}
            disabled={!dataUrl}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium text-white transition disabled:opacity-40"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

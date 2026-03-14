"use client";

import { useRef, useState } from "react";
import { Paperclip, CheckCircle, Loader2 } from "lucide-react";
import { uploadInvoiceAction } from "../actions";

export function UploadInvoiceButton({
  purchaseId,
  hasInvoice,
}: {
  purchaseId: string;
  hasInvoice: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("invoiceFile", file);

    const result = await uploadInvoiceAction(purchaseId, formData);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    }

    // limpar input para permitir re-upload do mesmo arquivo
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : done ? (
          <CheckCircle size={14} className="text-emerald-500" />
        ) : (
          <Paperclip size={14} />
        )}
        {loading ? "Enviando..." : done ? "Enviado!" : hasInvoice ? "Substituir NF" : "Anexar NF"}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef, useLayoutEffect, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2, Package, Loader2 } from "lucide-react";
import { updatePurchaseAction, type PurchaseUpdateState } from "../../actions";
import { formatCurrency } from "@stoqlab/utils";
import { toast } from "sonner";

type EditItem = {
  variantId: string;
  productName: string;
  color: string;
  size: string;
  sku: string;
  coverImageUrl: string | null;
  quantity: number;
  unitCost: number;
};

const PAYMENT_OPTIONS = [
  { value: "cash",   label: "Dinheiro" },
  { value: "pix",    label: "Pix" },
  { value: "debit",  label: "Débito" },
  { value: "credit", label: "Crédito" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
    >
      {pending ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : "Salvar alterações"}
    </button>
  );
}

function CurrencyField({ name, value, onChange }: { name: string; value: number; onChange: (v: number) => void }) {
  const [cents, setCents] = useState(() => Math.round(value * 100));
  const internalRef = useRef(false);

  useLayoutEffect(() => {
    if (internalRef.current) { internalRef.current = false; return; }
    setCents(Math.round(value * 100));
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const n = Math.min(cents * 10 + parseInt(e.key, 10), 99999999);
      setCents(n); internalRef.current = true; onChange(n / 100);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const n = Math.floor(cents / 10);
      setCents(n); internalRef.current = true; onChange(n / 100);
    } else if (e.key === "Delete" || e.key === "Escape") {
      e.preventDefault();
      setCents(0); internalRef.current = true; onChange(0);
    }
  }

  return (
    <input
      name={name}
      value={`R$ ${(cents / 100).toFixed(2).replace(".", ",")}`}
      readOnly
      onKeyDown={handleKeyDown}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-text"
    />
  );
}

export function EditPurchaseForm({
  purchaseId,
  items: initialItems,
  supplierId: initialSupplierId,
  invoiceNumber: initialInvoice,
  purchasedAt: initialDate,
  paymentMethod: initialPayment,
  freightCost: initialFreight,
  otherCosts: initialOtherCosts,
  notes: initialNotes,
  suppliers,
}: {
  purchaseId: string;
  items: EditItem[];
  supplierId: string;
  invoiceNumber: string;
  purchasedAt: string;
  paymentMethod: string;
  freightCost: number;
  otherCosts: number;
  notes: string;
  suppliers: { id: string; name: string }[];
}) {
  const updateWithId = updatePurchaseAction.bind(null, purchaseId);
  const [state, formAction] = useFormState(updateWithId, {} as PurchaseUpdateState);

  const [items, setItems] = useState<EditItem[]>(initialItems);
  const [freightCost, setFreightCost] = useState(initialFreight);
  const [otherCosts, setOtherCosts] = useState(initialOtherCosts);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  function changeQty(variantId: string, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.max(1, i.quantity + delta) }
          : i
      )
    );
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const productsCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalCost = productsCost + freightCost + otherCosts;

  const serializedItems = JSON.stringify(
    items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitCost: i.unitCost }))
  );

  if (items.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href={`/compras/${purchaseId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
          <p className="text-slate-600 font-medium">Todos os itens foram removidos.</p>
          <button type="button" onClick={() => setItems(initialItems)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Restaurar itens originais
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link href={`/compras/${purchaseId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar compra</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ajuste os itens, quantidades e informações da compra.</p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="items" value={serializedItems} />
        <input type="hidden" name="freightCost" value={freightCost} />
        <input type="hidden" name="otherCosts" value={otherCosts} />

        {/* Dados gerais */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
          <h2 className="font-semibold text-slate-900 text-sm">Dados da compra</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fornecedor</label>
              <select name="supplierId" defaultValue={initialSupplierId}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Sem fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nº Nota Fiscal <span className="text-red-500">*</span></label>
              <input name="invoiceNumber" required defaultValue={initialInvoice}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 000123" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data da compra <span className="text-red-500">*</span></label>
              <input type="date" name="purchasedAt" required defaultValue={initialDate}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forma de pagamento</label>
              <select name="paymentMethod" defaultValue={initialPayment}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {PAYMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Frete</label>
              <CurrencyField name="_freight" value={freightCost} onChange={setFreightCost} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Outros custos</label>
              <CurrencyField name="_other" value={otherCosts} onChange={setOtherCosts} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
              <textarea name="notes" defaultValue={initialNotes} rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Informações adicionais…" />
            </div>
          </div>
        </div>

        {/* Itens */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-sm">Itens ({items.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.variantId} className="flex items-center gap-3 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200 flex items-center justify-center">
                  {item.coverImageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={item.coverImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    : <Package size={14} className="text-slate-300" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{item.productName}</p>
                  <p className="text-xs text-slate-500">{item.color} · {item.size} · {item.sku}</p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <p>{formatCurrency(item.unitCost)}/un</p>
                  <p className="text-slate-400">{formatCurrency(item.quantity * item.unitCost)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => changeQty(item.variantId, -1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
                    <Minus size={11} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.variantId, 1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
                    <Plus size={11} />
                  </button>
                </div>
                <button type="button" onClick={() => removeItem(item.variantId)}
                  className="p-1 text-slate-300 hover:text-red-500 transition shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>{totalItems} peça{totalItems !== 1 ? "s" : ""} · Produtos</span>
              <span>{formatCurrency(productsCost)}</span>
            </div>
            {freightCost > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Frete</span>
                <span>{formatCurrency(freightCost)}</span>
              </div>
            )}
            {otherCosts > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Outros</span>
                <span>{formatCurrency(otherCosts)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <SubmitButton />
          <Link href={`/compras/${purchaseId}`} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { ShoppingCart, CheckCircle2, Minus, Plus } from "lucide-react";
import { qrSaleAction, type QrSaleState } from "./actions";

const PAYMENT_OPTIONS = [
  { value: "pix",    label: "Pix",      emoji: "⚡" },
  { value: "cash",   label: "Dinheiro", emoji: "💵" },
  { value: "debit",  label: "Débito",   emoji: "💳" },
  { value: "credit", label: "Crédito",  emoji: "🏦" },
];

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-base transition-all active:scale-[0.98]"
    >
      {pending ? (
        <span className="text-sm animate-pulse">Registrando venda...</span>
      ) : (
        <>
          <ShoppingCart size={20} />
          Confirmar venda
        </>
      )}
    </button>
  );
}

export function ScanSaleForm({
  variantId,
  salePrice,
  locations,
  stockMap,
}: {
  variantId: string;
  salePrice: number;
  locations: { id: string; name: string; type: string }[];
  stockMap: Record<string, number>;
}) {
  const [state, action] = useFormState<QrSaleState, FormData>(qrSaleAction, {});
  const [locationId, setLocationId] = useState(locations[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState("pix");

  const maxQty = stockMap[locationId] ?? 0;
  const total = salePrice * quantity;
  const paymentLabel = PAYMENT_OPTIONS.find((p) => p.value === (state.paymentMethod ?? payment))?.label ?? "";

  // ── Tela de sucesso ──────────────────────────────────────────
  if (state.success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center space-y-5">
        <CheckCircle2 size={52} className="text-emerald-500 mx-auto" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Venda registrada!</h2>
          <p className="text-sm text-slate-500 mt-1">
            {state.quantity} peça{(state.quantity ?? 1) !== 1 ? "s" : ""} · {paymentLabel}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          Vender novamente
        </button>
      </div>
    );
  }

  // ── Formulário ───────────────────────────────────────────────
  return (
    <form action={action} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-5">
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value={quantity} />
      <input type="hidden" name="paymentMethod" value={payment} />

      {/* Local de venda */}
      {locations.length === 0 ? null : locations.length === 1 ? (
        <>
          <input type="hidden" name="locationId" value={locationId} />
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Local</span>
            <span className="font-medium text-slate-900">{locations[0].name}</span>
          </div>
        </>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
            Local de venda
          </label>
          <select
            name="locationId"
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setQuantity(1);
            }}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {stockMap[l.id] ?? 0} disponível{(stockMap[l.id] ?? 0) !== 1 ? "is" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quantidade */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Quantidade
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
          >
            <Minus size={16} />
          </button>
          <span className="flex-1 text-center text-2xl font-black text-slate-900">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
            disabled={quantity >= maxQty}
            className="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition"
          >
            <Plus size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-1.5">
          {maxQty} disponível{maxQty !== 1 ? "is" : ""} nesta loja
        </p>
      </div>

      {/* Pagamento */}
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
          Pagamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPayment(opt.value)}
              className={`py-3 rounded-xl border text-sm font-semibold transition ${
                payment === opt.value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      {salePrice > 0 && (
        <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-2xl font-black text-slate-900">
            {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          {state.error}
        </p>
      )}

      {maxQty === 0 ? (
        <div className="w-full py-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold text-center">
          Sem estoque nesta loja
        </div>
      ) : (
        <SubmitButton />
      )}
    </form>
  );
}

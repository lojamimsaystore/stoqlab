"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ShoppingBag, Search } from "lucide-react";
import { createSaleAction } from "../actions";
import { formatCurrency } from "@stoqlab/utils";

type Variant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  salePrice: number;
  stock: number;
  productName: string;
};

type Item = {
  variantId: string;
  productName: string;
  label: string;
  quantity: number;
  salePrice: number;
  discount: number;
  stock: number;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Cartão de débito",
  credit: "Cartão de crédito",
  installment: "Parcelado",
};

const CHANNEL_LABELS: Record<string, string> = {
  store: "Loja física",
  whatsapp: "WhatsApp",
  ecommerce: "E-commerce",
  marketplace: "Marketplace",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Finalizando..." : "Finalizar venda"}
    </button>
  );
}

export function SaleForm({ variants }: { variants: Variant[] }) {
  const [state, formAction] = useFormState(createSaleAction, {});
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);

  const filtered = search.length > 1
    ? variants.filter(
        (v) =>
          v.productName.toLowerCase().includes(search.toLowerCase()) ||
          v.sku.toLowerCase().includes(search.toLowerCase()) ||
          v.color.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function addItem(v: Variant) {
    const existing = items.find((i) => i.variantId === v.id);
    if (existing) {
      if (existing.quantity >= v.stock) return;
      setItems(items.map((i) =>
        i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([...items, {
        variantId: v.id,
        productName: v.productName,
        label: `${v.color} · ${v.size}`,
        quantity: 1,
        salePrice: v.salePrice,
        discount: 0,
        stock: v.stock,
      }]);
    }
    setSearch("");
  }

  function updateQty(variantId: string, qty: number) {
    if (qty < 1) return;
    setItems(items.map((i) => i.variantId === variantId ? { ...i, quantity: qty } : i));
  }

  function updatePrice(variantId: string, price: number) {
    setItems(items.map((i) => i.variantId === variantId ? { ...i, salePrice: price } : i));
  }

  function removeItem(variantId: string) {
    setItems(items.filter((i) => i.variantId !== variantId));
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.salePrice, 0);
  const totalDiscount = globalDiscount;
  const total = Math.max(0, subtotal - totalDiscount);

  const serializedItems = JSON.stringify(items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
    salePrice: i.salePrice,
    discount: items.length > 0 && subtotal > 0 ? (i.quantity * i.salePrice / subtotal) * globalDiscount / i.quantity : 0,
  })));

  return (
    <form action={formAction} className="space-y-6">
      {/* Busca de produto */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Itens da venda</p>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto por nome, SKU ou cor..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Resultados da busca */}
        {filtered.length > 0 && (
          <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden shadow-sm max-h-56 overflow-y-auto">
            {filtered.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addItem(v)}
                disabled={v.stock === 0}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div>
                  <span className="font-medium text-slate-900">{v.productName}</span>
                  <span className="text-slate-500 ml-2">{v.color} · {v.size}</span>
                  <span className="text-slate-400 text-xs ml-2">({v.sku})</span>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-medium text-slate-900">{formatCurrency(v.salePrice)}</p>
                  <p className={`text-xs ${v.stock === 0 ? "text-red-500" : "text-slate-400"}`}>
                    {v.stock === 0 ? "Sem estoque" : `${v.stock} em estoque`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {search.length > 1 && filtered.length === 0 && (
          <p className="mt-2 text-sm text-slate-400 text-center">Nenhum produto encontrado</p>
        )}
      </div>

      {/* Itens adicionados */}
      {items.length > 0 ? (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-2 font-medium text-slate-600">Produto</th>
                <th className="px-4 py-2 font-medium text-slate-600 text-center">Qtd.</th>
                <th className="px-4 py-2 font-medium text-slate-600 text-right">Preço</th>
                <th className="px-4 py-2 font-medium text-slate-600 text-right">Subtotal</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.variantId}>
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-900">{item.productName}</p>
                    <p className="text-xs text-slate-500">{item.label}</p>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="number"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => updateQty(item.variantId, Number(e.target.value))}
                      className="w-16 text-center px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.salePrice}
                      onChange={(e) => updatePrice(item.variantId, Number(e.target.value))}
                      className="w-24 text-right px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2 text-right font-medium text-slate-900">
                    {formatCurrency(item.quantity * item.salePrice)}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => removeItem(item.variantId)} className="text-slate-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
          <ShoppingBag size={24} className="mx-auto mb-1 text-slate-300" />
          Busque um produto para adicionar
        </div>
      )}

      <hr className="border-slate-100" />

      {/* Pagamento e desconto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Forma de pagamento <span className="text-red-500">*</span>
          </label>
          <select
            name="paymentMethod"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Canal de venda
          </label>
          <select
            name="channel"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {Object.entries(CHANNEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Desconto (R$)
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={globalDiscount}
            onChange={(e) => setGlobalDiscount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
        <input
          name="notes"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Observações da venda..."
        />
      </div>

      {/* Resumo do total */}
      {items.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} peças)</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Desconto</span>
              <span>- {formatCurrency(totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-emerald-800 pt-1 border-t border-emerald-200">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      )}

      <input type="hidden" name="items" value={serializedItems} />

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        <Link href="/vendas" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

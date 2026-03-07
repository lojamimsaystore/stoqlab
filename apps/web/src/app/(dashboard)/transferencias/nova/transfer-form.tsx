"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeftRight, Search } from "lucide-react";
import { createTransferAction } from "../actions";

type Location = { id: string; name: string; type: string };
type Variant = { id: string; color: string; size: string; sku: string; productName: string; stock: Record<string, number> };
type Item = { variantId: string; productName: string; label: string; quantity: number; available: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition">
      {pending ? "Transferindo..." : "Confirmar transferência"}
    </button>
  );
}

export function TransferForm({ locations, variants }: { locations: Location[]; variants: Variant[] }) {
  const [state, formAction] = useFormState(createTransferAction, {});
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");

  const availableVariants = fromId
    ? variants.filter((v) => (v.stock[fromId] ?? 0) > 0)
    : [];

  const filtered = search.length > 1
    ? availableVariants.filter(
        (v) => v.productName.toLowerCase().includes(search.toLowerCase()) ||
          v.sku.toLowerCase().includes(search.toLowerCase()) ||
          v.color.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  function addItem(v: Variant) {
    if (items.find((i) => i.variantId === v.id)) return;
    setItems([...items, {
      variantId: v.id,
      productName: v.productName,
      label: `${v.color} · ${v.size}`,
      quantity: 1,
      available: v.stock[fromId] ?? 0,
    }]);
    setSearch("");
  }

  function updateQty(variantId: string, qty: number) {
    setItems(items.map((i) => i.variantId === variantId
      ? { ...i, quantity: Math.min(Math.max(1, qty), i.available) }
      : i));
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Origem / Destino */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Origem <span className="text-red-500">*</span>
          </label>
          <select name="fromLocationId" required value={fromId}
            onChange={(e) => { setFromId(e.target.value); setItems([]); }}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Selecione a origem</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Destino <span className="text-red-500">*</span>
          </label>
          <select name="toLocationId" required value={toId}
            onChange={(e) => setToId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Selecione o destino</option>
            {locations.filter((l) => l.id !== fromId).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
        <input name="notes"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Motivo da transferência..." />
      </div>

      <hr className="border-slate-100" />

      {/* Itens */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Itens a transferir</p>

        {!fromId ? (
          <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-lg">
            Selecione a origem para ver os produtos disponíveis
          </p>
        ) : (
          <>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto, SKU ou cor..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {filtered.length > 0 && (
              <div className="mb-3 border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                {filtered.map((v) => (
                  <button key={v.id} type="button" onClick={() => addItem(v)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-0">
                    <span>
                      <span className="font-medium text-slate-900">{v.productName}</span>
                      <span className="text-slate-500 ml-2">{v.color} · {v.size}</span>
                    </span>
                    <span className="text-slate-400 text-xs shrink-0 ml-4">{v.stock[fromId]} disponíveis</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {items.length > 0 && (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  <th className="px-4 py-2 font-medium text-slate-600">Produto / Variação</th>
                  <th className="px-4 py-2 font-medium text-slate-600 text-center">Qtd.</th>
                  <th className="px-4 py-2 font-medium text-slate-600 text-center">Disponível</th>
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
                      <input type="number" min={1} max={item.available} value={item.quantity}
                        onChange={(e) => updateQty(item.variantId, Number(e.target.value))}
                        className="w-16 text-center px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </td>
                    <td className="px-4 py-2 text-center text-slate-500">{item.available}</td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => setItems(items.filter((i) => i.variantId !== item.variantId))}
                        className="text-slate-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {fromId && items.length === 0 && (
          <div className="mt-2 py-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
            <ArrowLeftRight size={22} className="mx-auto mb-1 text-slate-300" />
            Nenhum item adicionado
          </div>
        )}
      </div>

      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })))} />

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        <Link href="/transferencias" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</Link>
      </div>
    </form>
  );
}

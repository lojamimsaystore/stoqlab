"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { createPurchaseAction } from "../actions";
import { formatCurrency } from "@stoqlab/utils";

type Supplier = { id: string; name: string };
type Variant = { id: string; color: string; size: string; sku: string };
type Product = { id: string; name: string; variants: Variant[] };
type Item = { variantId: string; productName: string; label: string; quantity: number; unitCost: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Registrando..." : "Confirmar compra"}
    </button>
  );
}

export function PurchaseForm({
  suppliers,
  products,
}: {
  suppliers: Supplier[];
  products: Product[];
}) {
  const [state, formAction] = useFormState(createPurchaseAction, {});
  const [items, setItems] = useState<Item[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [freightCost, setFreightCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);

  function addItem() {
    if (!selectedVariant || qty < 1) return;
    const exists = items.find((i) => i.variantId === selectedVariantId);
    if (exists) {
      setItems(items.map((i) =>
        i.variantId === selectedVariantId
          ? { ...i, quantity: i.quantity + qty, unitCost }
          : i
      ));
    } else {
      setItems([...items, {
        variantId: selectedVariantId,
        productName: selectedProduct!.name,
        label: `${selectedVariant.color} · ${selectedVariant.size}`,
        quantity: qty,
        unitCost,
      }]);
    }
    setSelectedProductId("");
    setSelectedVariantId("");
    setQty(1);
    setUnitCost(0);
  }

  function removeItem(variantId: string) {
    setItems(items.filter((i) => i.variantId !== variantId));
  }

  const productsCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalCost = productsCost + freightCost + otherCosts;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <form action={formAction} className="space-y-6">
      {/* Cabeçalho da compra */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fornecedor
          </label>
          <select
            name="supplierId"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sem fornecedor</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Data da compra <span className="text-red-500">*</span>
          </label>
          <input
            name="purchasedAt"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nº da nota fiscal
          </label>
          <input
            name="invoiceNumber"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: NF-001234"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações
          </label>
          <input
            name="notes"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observações gerais..."
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Adicionar itens */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Itens da compra</p>
        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Produto</label>
              <select
                value={selectedProductId}
                onChange={(e) => { setSelectedProductId(e.target.value); setSelectedVariantId(""); }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecione...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Variação (cor / tamanho)</label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProduct}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-100"
              >
                <option value="">Selecione...</option>
                {selectedProduct?.variants.map((v) => (
                  <option key={v.id} value={v.id}>{v.color} · {v.size} ({v.sku})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Custo unitário (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            disabled={!selectedVariantId || qty < 1}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400"
          >
            <Plus size={16} />
            Adicionar item
          </button>
        </div>

        {/* Lista de itens */}
        {items.length > 0 && (
          <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  <th className="px-4 py-2 font-medium text-slate-600">Produto / Variação</th>
                  <th className="px-4 py-2 font-medium text-slate-600 text-center">Qtd.</th>
                  <th className="px-4 py-2 font-medium text-slate-600 text-right">Custo unit.</th>
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
                    <td className="px-4 py-2 text-center text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-2 text-right text-slate-700">{formatCurrency(item.unitCost)}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-900">
                      {formatCurrency(item.quantity * item.unitCost)}
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
        )}

        {items.length === 0 && (
          <div className="mt-3 py-6 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
            <ShoppingCart size={24} className="mx-auto mb-1 text-slate-300" />
            Nenhum item adicionado
          </div>
        )}
      </div>

      <hr className="border-slate-100" />

      {/* Custos extras */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Custos adicionais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frete (R$)</label>
            <input
              name="freightCost"
              type="number"
              min="0"
              step="0.01"
              value={freightCost}
              onChange={(e) => setFreightCost(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Outros custos (R$)</label>
            <input
              name="otherCosts"
              type="number"
              min="0"
              step="0.01"
              value={otherCosts}
              onChange={(e) => setOtherCosts(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Resumo */}
      {(items.length > 0 || freightCost > 0 || otherCosts > 0) && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>{totalItems} peça(s)</span>
            <span>{formatCurrency(productsCost)}</span>
          </div>
          {freightCost > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Frete</span>
              <span>{formatCurrency(freightCost)}</span>
            </div>
          )}
          {otherCosts > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Outros custos</span>
              <span>{formatCurrency(otherCosts)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-900 pt-1 border-t border-slate-200 mt-1">
            <span>Total</span>
            <span>{formatCurrency(totalCost)}</span>
          </div>
          {totalItems > 0 && (
            <p className="text-xs text-slate-500 text-right">
              Custo médio real: {formatCurrency(totalCost / totalItems)} / peça
            </p>
          )}
        </div>
      )}

      {/* Hidden input com itens serializados */}
      <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        unitCost: i.unitCost,
      })))} />

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        <Link href="/compras" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

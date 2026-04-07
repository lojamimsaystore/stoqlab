"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2, Package, Loader2, User, UserCheck, X } from "lucide-react";
import { updateSaleAction, searchCustomersAction, type CustomerResult, type SaleState } from "../../actions";
import { formatCurrency } from "@stoqlab/utils";
import { toast } from "sonner";
import { NewCustomerModal, type NewCustomerData } from "../../nova/new-customer-modal";

type EditItem = {
  variantId: string;
  productName: string;
  color: string;
  size: string;
  sku: string;
  coverImageUrl: string | null;
  quantity: number;
  salePrice: number;
  discount: number;
  maxQuantity: number;
};

const PAYMENT_OPTIONS = [
  { value: "cash",   label: "Dinheiro", emoji: "💵" },
  { value: "pix",    label: "Pix",      emoji: "⚡" },
  { value: "debit",  label: "Débito",   emoji: "💳" },
  { value: "credit", label: "Crédito",  emoji: "🏦" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all"
    >
      {pending ? <><Loader2 size={15} className="animate-spin" /> Salvando…</> : "Salvar alterações"}
    </button>
  );
}

export function EditSaleForm({
  saleId,
  items: initialItems,
  paymentMethod: initialPayment,
  channel: initialChannel,
  notes: initialNotes,
  customer: initialCustomer,
}: {
  saleId: string;
  items: EditItem[];
  paymentMethod: string;
  channel: string;
  notes: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
}) {
  const updateSaleWithId = updateSaleAction.bind(null, saleId);
  const [state, formAction] = useFormState(updateSaleWithId, {} as SaleState);

  const [items, setItems] = useState<EditItem[]>(initialItems);
  const [paymentMethod, setPaymentMethod] = useState(initialPayment);
  const [notes, setNotes] = useState(initialNotes);

  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(
    initialCustomer ? { id: initialCustomer.id, name: initialCustomer.name, phone: initialCustomer.phone, email: initialCustomer.email, birthdate: null, address: null } : null
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerData | null>(null);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  function handleCustomerSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setCustomerSearch(value);
    setShowCustomerDropdown(false);
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    if (value.length < 2) { setCustomerResults([]); setSearchingCustomer(false); return; }
    setSearchingCustomer(true);
    customerDebounce.current = setTimeout(async () => {
      const results = await searchCustomersAction(value);
      setCustomerResults(results);
      setSearchingCustomer(false);
      setShowCustomerDropdown(true);
    }, 300);
  }

  function changeQty(variantId: string, delta: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.variantId === variantId
          ? { ...i, quantity: Math.max(1, Math.min(i.maxQuantity, i.quantity + delta)) }
          : i
      )
    );
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  const subtotal = items.reduce((s, i) => s + i.quantity * i.salePrice, 0);
  const totalDiscount = items.reduce((s, i) => s + i.quantity * i.discount, 0);
  const total = subtotal - totalDiscount;

  const activeCustomer = selectedCustomer ?? (newCustomer ? { id: null, name: newCustomer.name, phone: newCustomer.phone, email: newCustomer.email } : null);

  const serializedItems = JSON.stringify(
    items.map((i) => ({
      variantId: i.variantId,
      quantity: i.quantity,
      salePrice: i.salePrice,
      discount: i.discount,
    }))
  );

  if (items.length === 0) {
    return (
      <div className="max-w-2xl space-y-4">
        <Link href={`/vendas/${saleId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={15} /> Voltar
        </Link>
        <div className="bg-white rounded-xl border border-red-200 p-6 text-center">
          <p className="text-slate-600 font-medium">Todos os itens foram removidos.</p>
          <p className="text-sm text-slate-400 mt-1">Adicione ao menos um item para salvar.</p>
          <button type="button" onClick={() => setItems(initialItems)} className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
            Restaurar itens originais
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Link href={`/vendas/${saleId}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} /> Voltar
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar venda</h1>
        <p className="text-sm text-slate-500 mt-0.5">Ajuste os itens, quantidades e informações da venda.</p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="items" value={serializedItems} />
        <input type="hidden" name="channel" value={initialChannel} />
        {selectedCustomer && <input type="hidden" name="customerId" value={selectedCustomer.id} />}
        {newCustomer && (
          <>
            <input type="hidden" name="customerName" value={newCustomer.name} />
            <input type="hidden" name="customerCpf" value={newCustomer.cpf} />
            <input type="hidden" name="customerPhone" value={newCustomer.phone} />
            <input type="hidden" name="customerEmail" value={newCustomer.email} />
          </>
        )}

        {/* Itens */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
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
                  <p className="text-xs text-slate-500">{item.color} · {item.size}</p>
                </div>
                <div className="text-right text-xs text-slate-500 shrink-0">
                  <p>{formatCurrency(item.salePrice)}/un</p>
                  {item.maxQuantity > 0 && <p className="text-slate-300">máx {item.maxQuantity}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => changeQty(item.variantId, -1)}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition">
                    <Minus size={11} />
                  </button>
                  <span className="w-7 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                  <button type="button" onClick={() => changeQty(item.variantId, 1)}
                    disabled={item.quantity >= item.maxQuantity}
                    className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition disabled:opacity-30">
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
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500">Total</span>
            <span className="font-bold text-slate-900">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Pagamento */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Forma de pagamento</h2>
          <input type="hidden" name="paymentMethod" value={paymentMethod} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all ${
                  paymentMethod === opt.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
          <h2 className="font-semibold text-slate-900 text-sm">Cliente</h2>

          {activeCustomer ? (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <UserCheck size={15} className="text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-emerald-800 truncate">{activeCustomer.name}</p>
                {activeCustomer.phone && <p className="text-xs text-emerald-600">{activeCustomer.phone}</p>}
              </div>
              <button type="button" onClick={() => { setSelectedCustomer(null); setNewCustomer(null); }}
                className="p-1 text-emerald-400 hover:text-emerald-600 transition">
                <X size={13} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={customerSearch}
                onChange={handleCustomerSearch}
                onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                placeholder="Buscar cliente por nome, telefone ou e-mail…"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
              {searchingCustomer && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              {showCustomerDropdown && customerResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {customerResults.map((c) => (
                    <button key={c.id} type="button" onMouseDown={() => { setSelectedCustomer(c); setCustomerSearch(""); setShowCustomerDropdown(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 text-left text-sm border-b border-slate-100 last:border-0 transition-colors">
                      <User size={13} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!activeCustomer && (
            <button type="button" onClick={() => setShowNewCustomerModal(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium">
              + Cadastrar novo cliente
            </button>
          )}
        </div>

        {/* Observações */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <label className="block text-sm font-semibold text-slate-900">Observações</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none placeholder:text-slate-400"
            placeholder="Informações adicionais sobre a venda…"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{state.error}</p>
        )}

        <div className="flex items-center gap-3">
          <SubmitButton />
          <Link href={`/vendas/${saleId}`} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
            Cancelar
          </Link>
        </div>
      </form>

      {showNewCustomerModal && (
        <NewCustomerModal
          onConfirm={(data: NewCustomerData) => { setNewCustomer(data); setShowNewCustomerModal(false); }}
          onClose={() => setShowNewCustomerModal(false)}
        />
      )}
    </div>
  );
}

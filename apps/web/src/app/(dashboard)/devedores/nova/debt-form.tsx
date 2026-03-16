"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Package, ChevronRight, Check, Search, Users } from "lucide-react";
import {
  createDebtAction,
  searchCustomersAction,
  getAllCustomersAction,
  searchSalesByCustomerAction,
  type SaleOption,
} from "../actions";

type Customer = { id: string; name: string; phone?: string };

const METHODS = [
  { value: "cash", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "credit", label: "Cartão de crédito" },
  { value: "debit", label: "Cartão de débito" },
];

const INITIAL_STATE = { error: undefined };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
    >
      {pending ? "Salvando…" : "Registrar dívida"}
    </button>
  );
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function DebtForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(createDebtAction, INITIAL_STATE);

  // Step 1: customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [loadingAll, setLoadingAll] = useState(false);

  // Step 2: sales
  const [sales, setSales] = useState<SaleOption[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleOption | null>(null);
  const [catalogSale, setCatalogSale] = useState<SaleOption | null>(null); // for image popup

  // Step 3: payment
  const [paidAmount, setPaidAmount] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("pix");

  const totalAmount = selectedSale ? Number(selectedSale.total_value) : 0;
  const paid = Number(paidAmount) || 0;
  const remaining = totalAmount - paid;

  // Customer search debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (customerQuery.length < 1) { setCustomers([]); setShowDropdown(false); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCustomersAction(customerQuery);
      setCustomers(results);
      setShowDropdown(true);
    }, 300);
  }, [customerQuery]);

  async function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setShowDropdown(false);
    setSelectedSale(null);
    setPaidAmount("");
    setLoadingSales(true);
    const salesData = await searchSalesByCustomerAction(c.id);
    setSales(salesData);
    setLoadingSales(false);
  }

  function handleClearCustomer() {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setSales([]);
    setSelectedSale(null);
    setPaidAmount("");
  }

  async function handleOpenPicker() {
    setPickerOpen(true);
    setPickerQuery("");
    if (allCustomers.length === 0) {
      setLoadingAll(true);
      const data = await getAllCustomersAction();
      setAllCustomers(data);
      setLoadingAll(false);
    }
  }

  function handlePickerSelect(c: Customer) {
    setPickerOpen(false);
    handleSelectCustomer(c);
  }

  const filteredCustomers = pickerQuery
    ? allCustomers.filter(
        (c) =>
          c.name.toLowerCase().includes(pickerQuery.toLowerCase()) ||
          (c.phone ?? "").includes(pickerQuery)
      )
    : allCustomers;

  function handleSelectSale(s: SaleOption) {
    setSelectedSale(s);
    setPaidAmount(s.total_value); // default: full amount
  }

  return (
    <div className="space-y-6">
      {state?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          {state.error}
        </div>
      )}

      {/* ── Passo 1: Busca de cliente ── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">1. Cliente</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => {
                setCustomerQuery(e.target.value);
                if (selectedCustomer && e.target.value !== selectedCustomer.name) handleClearCustomer();
              }}
              onFocus={() => customers.length > 0 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Buscar por nome ou telefone…"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
            {showDropdown && customers.length > 0 && (
              <ul className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                {customers.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 text-sm flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold text-xs shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{c.name}</p>
                        {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Botão abrir todos os clientes */}
          <button
            type="button"
            onClick={handleOpenPicker}
            title="Ver todos os clientes"
            className="shrink-0 flex items-center justify-center w-12 h-12 border border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition"
          >
            <Search size={18} />
          </button>
        </div>
        {selectedCustomer && (
          <div className="mt-2 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <Check size={14} className="shrink-0" />
            <span className="font-medium">{selectedCustomer.name}</span>
            <button
              type="button"
              onClick={handleClearCustomer}
              className="ml-auto text-emerald-500 hover:text-emerald-700 text-xs underline"
            >
              Trocar
            </button>
          </div>
        )}
      </div>

      {/* ── Passo 2: Vendas do cliente ── */}
      {selectedCustomer && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">2. Selecionar compra</p>

          {loadingSales ? (
            <p className="text-sm text-slate-400 py-4 text-center">Carregando compras…</p>
          ) : sales.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhuma compra concluída encontrada.</p>
          ) : (
            <div className="space-y-2">
              {sales.map((s) => {
                const isSelected = selectedSale?.id === s.id;
                const date = new Date(s.sold_at).toLocaleDateString("pt-BR");
                const total = Number(s.total_value);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSale(s)}
                    className={`relative border rounded-xl p-3 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Thumbnails */}
                      <div className="flex items-center gap-1 shrink-0">
                        {s.items.slice(0, 4).map((item, i) => (
                          <div
                            key={i}
                            className="w-11 h-14 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0"
                            title={`${item.product_name} — ${item.color} ${item.size}`}
                          >
                            {item.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image_url}
                                alt={item.product_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package size={14} className="text-slate-300" />
                              </div>
                            )}
                          </div>
                        ))}
                        {s.items.length > 4 && (
                          <div className="w-11 h-14 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs text-slate-400 font-semibold">+{s.items.length - 4}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{date}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {s.items_count} {s.items_count === 1 ? "item" : "itens"}
                        </p>
                        <p className="text-sm font-bold text-slate-800 mt-1">{fmt(total)}</p>
                      </div>

                      {/* Ver catálogo */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCatalogSale(s); }}
                        className="shrink-0 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
                      >
                        Ver todos
                        <ChevronRight size={12} />
                      </button>

                      {isSelected && (
                        <div className="shrink-0 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Passo 3: Pagamento ── */}
      {selectedSale && (
        <form action={formAction} className="space-y-4">
          {/* Hidden */}
          <input type="hidden" name="customerId" value={selectedCustomer?.id ?? ""} />
          <input type="hidden" name="saleId" value={selectedSale.id} />
          <input type="hidden" name="totalAmount" value={selectedSale.total_value} />
          <input type="hidden" name="description" value={`Venda de ${new Date(selectedSale.sold_at).toLocaleDateString("pt-BR")} — ${selectedSale.items_count} itens`} />

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">3. Pagamento</p>

          {/* Resumo da dívida */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Valor total da compra</p>
              <p className="text-xl font-bold text-slate-900">{fmt(totalAmount)}</p>
            </div>
            {remaining > 0 && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Restante</p>
                <p className="text-xl font-bold text-red-600">{fmt(remaining < 0 ? 0 : remaining)}</p>
              </div>
            )}
            {remaining <= 0 && paid > 0 && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">Quitado</span>
            )}
          </div>

          {/* Valor pago */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valor pago <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <input
                type="number"
                name="paidAmount"
                step="0.01"
                min="0"
                max={totalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Data */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data do pagamento</label>
              <input
                type="date"
                name="paidAt"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Forma */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pagamento</label>
              <select
                name="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {totalAmount > 0 && paid > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Pago: {fmt(paid)}</span>
                <span>{Math.min(100, Math.round((paid / totalAmount) * 100))}%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${paid >= totalAmount ? "bg-emerald-500" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(100, (paid / totalAmount) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancelar
            </button>
            <div className="flex-1">
              <SubmitButton disabled={!selectedCustomer || !paidAmount} />
            </div>
          </div>
        </form>
      )}

      {/* ── Modal todos os clientes ── */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                <h2 className="text-base font-semibold text-slate-900">Selecionar cliente</h2>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Search inside modal */}
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="Filtrar por nome ou telefone…"
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {loadingAll ? (
                <p className="text-center text-sm text-slate-400 py-8">Carregando…</p>
              ) : filteredCustomers.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-8">Nenhum cliente encontrado.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handlePickerSelect(c)}
                        className="w-full text-left px-5 py-3 hover:bg-blue-50 flex items-center gap-3 transition"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                          {c.phone && <p className="text-xs text-slate-400">{c.phone}</p>}
                        </div>
                        <ChevronRight size={14} className="ml-auto text-slate-300 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-center">
              {filteredCustomers.length} cliente{filteredCustomers.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal catálogo de itens ── */}
      {catalogSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={() => setCatalogSale(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  Compra de {new Date(catalogSale.sold_at).toLocaleDateString("pt-BR")}
                </h2>
                <p className="text-xs text-slate-500">{catalogSale.items_count} itens · {fmt(Number(catalogSale.total_value))}</p>
              </div>
              <button
                type="button"
                onClick={() => setCatalogSale(null)}
                className="text-slate-400 hover:text-slate-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {catalogSale.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="aspect-[3/4] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={24} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-800 leading-tight line-clamp-2">{item.product_name}</p>
                  <p className="text-[10px] text-slate-400">{item.color} · {item.size} · Qtd: {item.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

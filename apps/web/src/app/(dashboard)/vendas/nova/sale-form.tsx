"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search, Trash2, ShoppingBag, ArrowLeft, Package,
  Plus, Minus, ChevronRight, Loader2, AlertCircle, Tag,
  User, UserCheck, X, LayoutGrid, UserPlus, Pencil,
} from "lucide-react";
import { createSaleAction, searchCustomersAction, type CustomerResult } from "../actions";
import { formatCurrency } from "@stoqlab/utils";
import { toast } from "sonner";
import { ProductCatalogModal } from "./product-catalog-modal";
import { NewCustomerModal, type NewCustomerData } from "./new-customer-modal";

type Variant = {
  id: string;
  color: string;
  colorHex: string | null;
  size: string;
  sku: string;
  salePrice: number;
  locationStock: Record<string, number>;
  productName: string;
  coverImageUrl: string | null;
};

type Location = {
  id: string;
  name: string;
  type: string;
};

type Item = {
  variantId: string;
  productName: string;
  color: string;
  colorHex: string | null;
  size: string;
  coverImageUrl: string | null;
  quantity: number;
  salePrice: number;
  stock: number;
};

const PAYMENT_OPTIONS = [
  { value: "cash",   label: "Dinheiro", emoji: "💵" },
  { value: "pix",    label: "Pix",      emoji: "⚡" },
  { value: "debit",  label: "Débito",   emoji: "💳" },
  { value: "credit", label: "Crédito",  emoji: "🏦" },
];

const CHANNEL_OPTIONS = [
  { value: "store",       label: "Loja física"  },
  { value: "whatsapp",    label: "WhatsApp"     },
  { value: "ecommerce",   label: "E-commerce"   },
  { value: "marketplace", label: "Marketplace"  },
];

const COLOR_HEX: Record<string, string> = {
  "PRETO": "#111111", "BRANCO": "#FFFFFF", "CINZA": "#9E9E9E",
  "AZUL MARINHO": "#1A237E", "VERDE": "#2E7D32", "AMARELO": "#FDD835",
  "LARANJA": "#EF6C00", "VERMELHO": "#C62828", "ROSA": "#E91E8C",
  "ROXO": "#6A1B9A", "VINHO": "#6D0000", "BEGE": "#F5F0E8",
  "NUDE": "#E8C9A0", "MARROM": "#5D3A1A",
};

function resolveColor(hex: string | null, name: string) {
  return hex ?? COLOR_HEX[name?.toUpperCase()?.trim()] ?? "#94a3b8";
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl text-sm transition-all"
    >
      {pending
        ? <><Loader2 size={16} className="animate-spin" /> Finalizando…</>
        : <>Finalizar venda <ChevronRight size={16} /></>
      }
    </button>
  );
}

export function SaleForm({ variants, locations }: { variants: Variant[]; locations: Location[] }) {
  const [state, formAction] = useFormState(createSaleAction, {});
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [showSearch, setShowSearch] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id ?? "");
  const [installments, setInstallments] = useState(1);
  const [hasInterest, setHasInterest] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Customer — existing
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResult | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const customerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer — new (modal)
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
    if (value.length < 2) {
      setCustomerResults([]);
      setSearchingCustomer(false);
      return;
    }
    setSearchingCustomer(true);
    customerDebounce.current = setTimeout(async () => {
      const results = await searchCustomersAction(value);
      setCustomerResults(results);
      setSearchingCustomer(false);
      setShowCustomerDropdown(true);
    }, 300);
  }

  function selectCustomer(c: CustomerResult) {
    setSelectedCustomer(c);
    setCustomerSearch("");
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setNewCustomer(null);
  }

  const locationVariants = variants.map((v) => ({
    ...v,
    stock: v.locationStock[selectedLocationId] ?? 0,
  })).filter((v) => v.stock > 0);

  const filtered = search.length > 1
    ? locationVariants
        .filter((v) =>
          v.productName.toLowerCase().includes(search.toLowerCase()) ||
          v.sku.toLowerCase().includes(search.toLowerCase()) ||
          v.color.toLowerCase().includes(search.toLowerCase()) ||
          v.size.toLowerCase().includes(search.toLowerCase())
        )
        .slice(0, 12)
    : [];

  function addItem(v: typeof locationVariants[number]) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === v.id);
      if (existing) {
        if (existing.quantity >= v.stock) return prev;
        return prev.map((i) => i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        variantId: v.id, productName: v.productName, color: v.color,
        colorHex: v.colorHex, size: v.size, coverImageUrl: v.coverImageUrl,
        quantity: 1, salePrice: v.salePrice, stock: v.stock,
      }];
    });
    setSearch("");
    searchRef.current?.focus();
  }

  function addItemFromCatalog(v: typeof locationVariants[number]) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === v.id);
      if (existing) {
        if (existing.quantity >= v.stock) return prev;
        return prev.map((i) => i.variantId === v.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        variantId: v.id, productName: v.productName, color: v.color,
        colorHex: v.colorHex, size: v.size, coverImageUrl: v.coverImageUrl,
        quantity: 1, salePrice: v.salePrice, stock: v.stock,
      }];
    });
  }

  function changeQty(variantId: string, delta: number) {
    setItems(items.map((i) =>
      i.variantId === variantId
        ? { ...i, quantity: Math.max(1, Math.min(i.stock, i.quantity + delta)) }
        : i
    ));
  }

  function setQtyDirect(variantId: string, qty: number) {
    const item = items.find((i) => i.variantId === variantId);
    if (!item || qty < 1) return;
    setItems(items.map((i) =>
      i.variantId === variantId ? { ...i, quantity: Math.min(item.stock, qty) } : i
    ));
  }

  function setPrice(variantId: string, price: number) {
    setItems(items.map((i) => i.variantId === variantId ? { ...i, salePrice: price } : i));
  }

  function removeItem(variantId: string) {
    setItems(items.filter((i) => i.variantId !== variantId));
  }

  const totalPecas = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal   = items.reduce((s, i) => s + i.quantity * i.salePrice, 0);
  const total      = Math.max(0, subtotal - globalDiscount);

  const serializedItems = JSON.stringify(items.map((i) => ({
    variantId: i.variantId,
    quantity:  i.quantity,
    salePrice: i.salePrice,
    discount:  subtotal > 0
      ? (i.quantity * i.salePrice / subtotal) * globalDiscount / i.quantity
      : 0,
  })));

  return (
    <form action={formAction} className="flex flex-col h-full bg-slate-50">

      {/* ── Topbar ────────────────────────────────────────── */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/vendas"
            className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </Link>
          <span className="text-slate-200">|</span>
          <h1 className="text-sm font-semibold text-slate-900">Nova venda</h1>
        </div>
        <span className="text-xs text-slate-400 hidden sm:block">
          {locationVariants.length} produto{locationVariants.length !== 1 ? "s" : ""} disponíveis
        </span>
      </div>

      {/* ── Dois painéis ──────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ═══ Esquerdo: itens ════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">

          {/* Busca */}
          <div className="p-4 lg:p-5 border-b border-slate-200 bg-white shrink-0 relative z-10">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 150)}
                  placeholder="Buscar produto por nome, SKU, cor ou tamanho…"
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 placeholder:text-slate-400"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCatalog(true)}
                title="Abrir catálogo de produtos"
                className="flex items-center gap-2 px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shrink-0"
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Catálogo</span>
              </button>
            </div>

            {/* Dropdown */}
            {showSearch && search.length > 1 && (
              <div className="absolute left-4 right-4 top-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto mt-1">
                {filtered.length > 0 ? filtered.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onMouseDown={() => addItem(v)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
                      {v.coverImageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={v.coverImageUrl} alt={v.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">{v.productName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: resolveColor(v.colorHex, v.color) }} />
                        <span className="text-xs text-slate-500">{v.color} · {v.size}</span>
                        <span className="text-xs text-slate-400 font-mono">{v.sku}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(v.salePrice)}</p>
                      <p className="text-xs text-slate-400">{v.stock} em estoque</p>
                    </div>
                    <Plus size={14} className="text-blue-500 shrink-0 ml-1" />
                  </button>
                )) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">
                    Nenhum produto encontrado para &ldquo;{search}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 relative">
            {items.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center mb-4">
                  <ShoppingBag size={28} className="text-slate-300" />
                </div>
                <p className="text-slate-600 font-semibold">Nenhum item adicionado</p>
                <p className="text-slate-400 text-sm mt-1 max-w-xs">
                  Busque produtos acima para adicioná-los à venda
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={item.variantId}
                    className="bg-white rounded-xl border border-slate-200 flex items-center gap-3 p-3 hover:shadow-sm hover:border-slate-300 transition-all"
                  >
                    {/* Índice */}
                    <span className="text-xs font-bold text-slate-300 w-5 text-center shrink-0 select-none">
                      {idx + 1}
                    </span>

                    {/* Thumbnail */}
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden border border-slate-100 aspect-[3/4]">
                      {item.coverImageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.coverImageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center"><Package size={14} className="text-slate-300" /></div>
                      }
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{item.productName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: resolveColor(item.colorHex, item.color) }} />
                        <span className="text-xs text-slate-500">{item.color} · {item.size}</span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-400">{item.stock} disp.</span>
                      </div>
                    </div>

                    {/* Preço unit */}
                    <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wide">Preço unit.</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">R$</span>
                        <input
                          type="number" min={0} step="0.01"
                          value={item.salePrice}
                          onChange={(e) => setPrice(item.variantId, Number(e.target.value))}
                          className="w-20 text-right px-2 py-1 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Qtd */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => changeQty(item.variantId, -1)}
                        disabled={item.quantity <= 1}
                        aria-label="Diminuir"
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <Minus size={12} />
                      </button>
                      <input type="number" min={1} max={item.stock}
                        value={item.quantity}
                        onChange={(e) => setQtyDirect(item.variantId, Number(e.target.value))}
                        aria-label="Quantidade"
                        className="w-10 text-center border border-slate-200 rounded-lg text-sm font-bold text-slate-900 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => changeQty(item.variantId, +1)}
                        disabled={item.quantity >= item.stock}
                        aria-label="Aumentar"
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="w-20 text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.salePrice)}
                      </p>
                    </div>

                    {/* Remover */}
                    <button type="button" onClick={() => removeItem(item.variantId)}
                      aria-label="Remover item"
                      className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rodapé contagem */}
          {items.length > 0 && (
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between shrink-0 text-sm">
              <span className="text-slate-500">
                <strong className="text-slate-800 font-semibold">{items.length}</strong> produto{items.length !== 1 ? "s" : ""}&nbsp;·&nbsp;
                <strong className="text-slate-800 font-semibold">{totalPecas}</strong> peça{totalPecas !== 1 ? "s" : ""}
              </span>
              <span className="text-slate-500">
                Subtotal:&nbsp;<strong className="text-slate-800">{formatCurrency(subtotal)}</strong>
              </span>
            </div>
          )}
        </div>

        {/* ═══ Direito: checkout ══════════════════════════ */}
        <div className="w-80 xl:w-96 flex flex-col min-h-0 bg-white border-l border-slate-200 shrink-0">

          {/* Pagamento */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 shrink-0 space-y-2">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pagamento
            </p>
            <div className="grid grid-cols-4 gap-1">
              {PAYMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setPaymentMethod(opt.value);
                    if (opt.value !== "credit") {
                      setInstallments(1);
                      setHasInterest(false);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-[10px] font-medium transition-all ${
                    paymentMethod === opt.value
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  <span className="text-base leading-none">{opt.emoji}</span>
                  <span className="leading-tight text-center truncate w-full px-0.5">{opt.label}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="paymentMethod" value={paymentMethod} />

            {/* Parcelamento — aparece só quando Crédito selecionado */}
            {paymentMethod === "credit" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Parcelamento</p>
                <div className="flex items-center gap-3">
                  {/* Contador de parcelas */}
                  <div className="flex items-center gap-1.5">
                    <button type="button"
                      onClick={() => setInstallments((p) => Math.max(1, p - 1))}
                      disabled={installments <= 1}
                      className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                      <Minus size={11} />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-slate-900 tabular-nums">
                      {installments}x
                    </span>
                    <button type="button"
                      onClick={() => setInstallments((p) => Math.min(24, p + 1))}
                      disabled={installments >= 24}
                      className="w-6 h-6 rounded-md border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Toggle juros */}
                  <button type="button"
                    onClick={() => setHasInterest((p) => !p)}
                    className={`flex-1 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                      hasInterest
                        ? "bg-red-50 border-red-200 text-red-600"
                        : "bg-emerald-50 border-emerald-200 text-emerald-600"
                    }`}>
                    {hasInterest ? "Com juros" : "Sem juros"}
                  </button>
                </div>
                <input type="hidden" name="installments" value={installments} />
                <input type="hidden" name="hasInterest" value={hasInterest ? "true" : "false"} />
              </div>
            )}
          </div>

          {/* Opções */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">

            {/* ── Cliente ── */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Cliente
              </label>

              {selectedCustomer && (
                <>
                  <input type="hidden" name="customerId" value={selectedCustomer.id} />
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2">
                    <UserCheck size={13} className="text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{selectedCustomer.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(" · ") || "Sem contato"}
                      </p>
                    </div>
                    <button type="button" onClick={clearCustomer}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                </>
              )}

              {!selectedCustomer && newCustomer && (
                <>
                  <input type="hidden" name="customerName"      value={newCustomer.name} />
                  <input type="hidden" name="customerCpf"       value={newCustomer.cpf} />
                  <input type="hidden" name="customerPhone"     value={newCustomer.phone} />
                  <input type="hidden" name="customerEmail"     value={newCustomer.email} />
                  <input type="hidden" name="customerBirthdate" value={newCustomer.birthdate} />
                  <input type="hidden" name="customerAddress"   value={newCustomer.address} />
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                    <UserPlus size={13} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-semibold text-slate-800 truncate">{newCustomer.name}</p>
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-100 rounded px-1 shrink-0">Novo</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {[newCustomer.phone, newCustomer.email].filter(Boolean).join(" · ") || "Sem contato"}
                      </p>
                    </div>
                    <button type="button" onClick={() => setShowNewCustomerModal(true)}
                      className="text-slate-400 hover:text-blue-500 transition-colors shrink-0" title="Editar">
                      <Pencil size={12} />
                    </button>
                    <button type="button" onClick={clearCustomer}
                      className="text-slate-400 hover:text-red-500 transition-colors shrink-0" title="Remover">
                      <X size={12} />
                    </button>
                  </div>
                </>
              )}

              {!selectedCustomer && !newCustomer && (
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      value={customerSearch}
                      onChange={handleCustomerSearch}
                      onFocus={() => customerResults.length > 0 && setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Buscar cliente…"
                      className="w-full pl-7 pr-6 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                    />
                    {searchingCustomer && (
                      <Loader2 size={11} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                    )}
                    {showCustomerDropdown && customerResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden max-h-44 overflow-y-auto">
                        {customerResults.map((c) => (
                          <button key={c.id} type="button"
                            onMouseDown={() => selectCustomer(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-left border-b border-slate-100 last:border-0 transition-colors"
                          >
                            <User size={11} className="text-slate-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{c.phone ?? c.email ?? "—"}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {showCustomerDropdown && customerResults.length === 0 && !searchingCustomer && customerSearch.length >= 2 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 px-3 py-2.5 text-[11px] text-slate-400 text-center">
                        Nenhum cliente encontrado
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewCustomerModal(true)}
                    title="Cadastrar novo cliente"
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all shrink-0"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Local de venda */}
            {locations.length > 0 && (
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Local
                </label>
                <select
                  value={selectedLocationId}
                  onChange={(e) => {
                    setSelectedLocationId(e.target.value);
                    setItems([]);
                    setSearch("");
                  }}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.type === "store" ? "🏪" : "🏭"} {l.name}
                    </option>
                  ))}
                </select>
                <input type="hidden" name="locationId" value={selectedLocationId} />
              </div>
            )}

            {/* Canal + Desconto lado a lado */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Canal
                </label>
                <select name="channel"
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Desconto (R$)
                </label>
                <div className="relative">
                  <Tag size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="number" min={0} max={subtotal} step="0.01"
                    value={globalDiscount || ""}
                    onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                    placeholder="0,00"
                    className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Observações
              </label>
              <textarea name="notes" rows={2}
                placeholder="Informações adicionais…"
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Total + finalizar */}
          <div className="px-3 py-3 border-t border-slate-100 shrink-0 space-y-3">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-700 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {globalDiscount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-red-500">Desconto</span>
                  <span className="font-medium text-red-500 tabular-nums">− {formatCurrency(globalDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-2xl font-bold text-emerald-600 tabular-nums leading-none">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {state?.error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                {state.error}
              </div>
            )}

            <input type="hidden" name="items" value={serializedItems} />

            <SubmitButton disabled={items.length === 0} />

            <Link href="/vendas"
              className="block text-center text-xs text-slate-400 hover:text-slate-600 transition-colors">
              Cancelar
            </Link>
          </div>
        </div>
      </div>

      {/* Modal catálogo */}
      {showCatalog && (
        <ProductCatalogModal
          variants={locationVariants}
          cartVariantIds={new Set(items.map((i) => i.variantId))}
          onSelect={addItemFromCatalog}
          onClose={() => setShowCatalog(false)}
        />
      )}

      {/* Modal novo cliente */}
      {showNewCustomerModal && (
        <NewCustomerModal
          initial={newCustomer ?? undefined}
          onConfirm={(data) => {
            setNewCustomer(data);
            setShowNewCustomerModal(false);
          }}
          onClose={() => setShowNewCustomerModal(false)}
        />
      )}
    </form>
  );
}

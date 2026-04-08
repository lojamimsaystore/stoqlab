"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, ShoppingCart, Paperclip, Pencil, Check, X, Camera, ChevronDown } from "lucide-react";

import { createPurchaseAction } from "../actions";
import { uploadTempPhotoAction } from "@/app/(dashboard)/produtos/actions";
import { formatCurrency } from "@stoqlab/utils";
import { QuickAddSupplierModal } from "./quick-add-supplier-modal";
import { QuickAddProductModal } from "./quick-add-product-modal";
import { QuickAddVariantModal, type CreatedVariant } from "./quick-add-variant-modal";

type Supplier = { id: string; name: string };
type Category = { id: string; name: string };
type Variant = { id: string; color: string; size: string; sku: string };
type Product = { id: string; name: string; imageUrl?: string | null; categoryId?: string | null; variants: Variant[]; isPending?: boolean };
type Item = { itemKey: string; variantId: string; productId: string; productName: string; imageUrl?: string | null; label: string; quantity: number; unitCost: number };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Registrando..." : "Confirmar compra"}
    </button>
  );
}

function CurrencyInput({
  name,
  value,
  onChange,
  className,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [cents, setCents] = useState(() => Math.round(value * 100));
  const internalRef = useRef(false);

  useLayoutEffect(() => {
    if (internalRef.current) {
      internalRef.current = false;
      return;
    }
    setCents(Math.round(value * 100));
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const newCents = Math.min(cents * 10 + parseInt(e.key, 10), 99999999);
      setCents(newCents);
      internalRef.current = true;
      onChange(newCents / 100);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      const newCents = Math.floor(cents / 10);
      setCents(newCents);
      internalRef.current = true;
      onChange(newCents / 100);
    } else if (e.key === "Delete" || e.key === "Escape") {
      e.preventDefault();
      setCents(0);
      internalRef.current = true;
      onChange(0);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").trim();
    const cleaned = text.replace(/[^\d,\.]/g, "");
    let num = 0;
    if (/^\d+,\d{2}$/.test(cleaned)) {
      num = parseFloat(cleaned.replace(",", "."));
    } else if (/^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(cleaned)) {
      num = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    } else {
      num = parseFloat(cleaned.replace(",", ".")) || 0;
    }
    const newCents = Math.min(Math.round(num * 100), 99999999);
    setCents(newCents);
    internalRef.current = true;
    onChange(newCents / 100);
  }

  const display = cents === 0 ? "" : `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <input
        type="text"
        inputMode="numeric"
        value={display}
        placeholder="R$ 0,00"
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onChange={() => {}}
        className={className}
      />
    </>
  );
}

export function PurchaseForm({
  suppliers: initialSuppliers,
  products: initialProducts,
  categories,
  existingColors = [],
}: {
  suppliers: Supplier[];
  products: Product[];
  categories: Category[];
  existingColors?: { name: string; hex: string | null }[];
}) {
  const [state, formAction] = useFormState(createPurchaseAction, {});
  const invoiceFileRef = useRef<HTMLInputElement>(null);
  const [invoiceFileName, setInvoiceFileName] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productEditModalOpen, setProductEditModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [variantEditModalOpen, setVariantEditModalOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [freightCost, setFreightCost] = useState(0);
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(1);
  const [editUnitCost, setEditUnitCost] = useState(0);
  const [pendingProducts, setPendingProducts] = useState<Array<{tempId: string; name: string; categoryId?: string}>>([]);
  const [pendingVariants, setPendingVariants] = useState<Array<{tempId: string; productTempId: string; color: string; colorHex?: string; size: string; photoUrl?: string}>>([]);

  // Product combobox
  const [productComboOpen, setProductComboOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const productComboRef = useRef<HTMLDivElement>(null);

  // Qty/cost dialog for existing variants
  const [qtyPriceDialog, setQtyPriceDialog] = useState<{
    variantId: string; productId: string; productName: string; label: string; imageUrl?: string | null;
  } | null>(null);
  const [dialogQty, setDialogQty] = useState(1);
  const [dialogCost, setDialogCost] = useState(0);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const selectedVariant = selectedProduct?.variants.find((v) => v.id === selectedVariantId);
  const selectedPendingProduct = pendingProducts.find((p) => p.tempId === selectedProductId && !selectedProduct);
  const effectiveProductName = selectedProduct?.name ?? selectedPendingProduct?.name ?? "";

  // Close combobox on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (productComboRef.current && !productComboRef.current.contains(e.target as Node)) {
        setProductComboOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Suggested category for the new product modal based on search text
  const suggestedCategoryId = products.find(
    (p) => productSearch && p.name.toLowerCase().includes(productSearch.toLowerCase())
  )?.categoryId ?? "";

  function handleAddClick() {
    if (!selectedVariant) return;
    // Open qty/cost dialog for existing variants
    setQtyPriceDialog({
      variantId: selectedVariantId,
      productId: selectedProductId,
      productName: selectedProduct!.name,
      label: `${selectedVariant.color} · ${selectedVariant.size}`,
      imageUrl: selectedProduct!.imageUrl,
    });
    setDialogQty(1);
    setDialogCost(0);
  }

  function confirmQtyPrice() {
    if (!qtyPriceDialog || dialogQty < 1) return;
    const { variantId, productId, productName, label, imageUrl } = qtyPriceDialog;
    setItems((prev) => [...prev, {
      itemKey: crypto.randomUUID(),
      variantId,
      productId,
      productName,
      imageUrl,
      label,
      quantity: dialogQty,
      unitCost: dialogCost,
    }]);
    setQtyPriceDialog(null);
    setSelectedProductId("");
    setSelectedVariantId("");
    setProductSearch("");
  }

  function removeItem(itemKey: string) {
    setItems(items.filter((i) => i.itemKey !== itemKey));
  }

  function startEdit(item: Item) {
    setEditingItemKey(item.itemKey);
    setEditQty(item.quantity);
    setEditUnitCost(item.unitCost);
  }

  function saveEdit() {
    if (!editingItemKey || editQty < 1) return;
    setItems(items.map((i) =>
      i.itemKey === editingItemKey ? { ...i, quantity: editQty, unitCost: editUnitCost } : i
    ));
    setEditingItemKey(null);
  }

  function cancelEdit() {
    setEditingItemKey(null);
  }

  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImageForKey, setUploadingImageForKey] = useState<string | null>(null);

  const handleImageEdit = useCallback((itemKey: string) => {
    setUploadingImageForKey(itemKey);
    imageInputRef.current?.click();
  }, []);

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const key = uploadingImageForKey;
    if (!file || !key) return;
    e.target.value = "";
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const url = await uploadTempPhotoAction(fd);
      if (!url) return;
      setItems((prev) => prev.map((i) =>
        i.itemKey === key ? { ...i, imageUrl: url } : i
      ));
      // Update photoUrl in pending variant if applicable
      const item = items.find((i) => i.itemKey === key);
      if (item) {
        setPendingVariants((prev) => prev.map((pv) =>
          pv.tempId === item.variantId ? { ...pv, photoUrl: url } : pv
        ));
      }
    } finally {
      setUploadingImageForKey(null);
    }
  }

  const productsCost = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalCost = productsCost + freightCost;

  return (
    <>
      <QuickAddSupplierModal
        open={supplierModalOpen}
        onClose={() => setSupplierModalOpen(false)}
        onCreated={(supplier) => {
          setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)));
          setSelectedSupplierId(supplier.id);
        }}
      />
      <QuickAddProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        defaultName={productSearch}
        defaultCategoryId={suggestedCategoryId}
        categories={categories}
        onCreated={(p) => {
          setPendingProducts((prev) => [...prev, { tempId: p.tempId, name: p.name, categoryId: p.categoryId }]);
          setSelectedProductId(p.tempId);
          setSelectedVariantId("");
          setProductSearch("");
        }}
      />
      <QuickAddProductModal
        open={productEditModalOpen}
        onClose={() => setProductEditModalOpen(false)}
        editProduct={pendingProducts.find((p) => p.tempId === selectedProductId)}
        categories={categories}
        onUpdated={(p) => {
          setProducts((prev) => prev.map((prod) =>
            prod.id === p.tempId ? { ...prod, name: p.name } : prod
          ));
          setPendingProducts((prev) => prev.map((pp) =>
            pp.tempId === p.tempId ? { ...pp, name: p.name, categoryId: p.categoryId } : pp
          ));
          setItems((prev) => prev.map((item) =>
            item.productId === p.tempId ? { ...item, productName: p.name } : item
          ));
        }}
      />
      <QuickAddVariantModal
        open={variantModalOpen}
        onClose={() => setVariantModalOpen(false)}
        productId={selectedProductId}
        productName={effectiveProductName}
        existingColorNames={existingColors}
        onCreated={(variants: CreatedVariant[]) => {
          const prodId   = selectedProductId;
          const prodName = effectiveProductName;
          const prodImage = selectedProduct?.imageUrl ?? null;

          setPendingVariants((prev) => [...prev, ...variants.map((v) => ({
            tempId: v.tempId,
            productTempId: prodId,
            color: v.color,
            colorHex: v.colorHex,
            size: v.size,
            photoUrl: v.photoUrl,
          }))]);

          // Add all variants directly — each gets a unique itemKey
          setItems((prev) => {
            const toAdd = variants.map((v) => ({
              itemKey: crypto.randomUUID(),
              variantId: v.tempId,
              productId: prodId,
              productName: prodName,
              imageUrl: v.photoUrl ?? prodImage,
              label: `${v.color} · ${v.size}`,
              quantity: v.quantity,
              unitCost: v.unitCost,
            }));
            return [...prev, ...toAdd];
          });

          setSelectedProductId("");
          setSelectedVariantId("");
        }}
      />
      <QuickAddVariantModal
        open={variantEditModalOpen}
        onClose={() => setVariantEditModalOpen(false)}
        productId={selectedProductId}
        productName={selectedProduct?.name ?? ""}
        existingColorNames={existingColors}
        editVariant={pendingVariants.find((v) => v.tempId === selectedVariantId)}
        onUpdated={(v) => {
          setProducts((prev) => prev.map((p) =>
            p.id === selectedProductId
              ? { ...p, variants: p.variants.map((pv) => pv.id === v.tempId ? { ...pv, color: v.color, size: v.size } : pv) }
              : p
          ));
          setPendingVariants((prev) => prev.map((pv) =>
            pv.tempId === v.tempId ? { ...pv, color: v.color, colorHex: v.colorHex, size: v.size, photoUrl: v.photoUrl } : pv
          ));
          setItems((prev) => prev.map((item) =>
            item.variantId === v.tempId
              ? { ...item, label: `${v.color} · ${v.size}`, imageUrl: v.photoUrl ?? item.imageUrl }
              : item
          ));
        }}
      />

      {/* Qty/Cost dialog for existing variants */}
      {qtyPriceDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900 text-sm">{qtyPriceDialog.productName}</p>
                <p className="text-xs text-slate-500">{qtyPriceDialog.label}</p>
              </div>
              <button type="button" onClick={() => setQtyPriceDialog(null)} className="text-slate-400 hover:text-slate-600 mt-0.5">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                <input
                  type="number" min="1" autoFocus
                  value={dialogQty}
                  onChange={(e) => setDialogQty(Math.max(1, Number(e.target.value)))}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmQtyPrice(); }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Custo unit.</label>
                <CurrencyInput
                  name=""
                  value={dialogCost}
                  onChange={setDialogCost}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={confirmQtyPrice}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setQtyPriceDialog(null)}
                className="px-4 text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <form action={formAction} encType="multipart/form-data" className="flex flex-col lg:flex-row gap-4 lg:h-full">

        {/* ── Coluna principal ─────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 lg:min-h-0">

          {/* Informações da compra */}
          <div className="shrink-0 bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Informações da compra
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Fornecedor */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-700 mb-1">Fornecedor</label>
                <div className="flex gap-1.5">
                  <select
                    name="supplierId"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                  >
                    <option value="">Sem fornecedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSupplierModalOpen(true)}
                    title="Cadastrar novo fornecedor"
                    className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* Data */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  name="purchasedAt"
                  type="date"
                  required
                  defaultValue={new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>

              {/* Nº NF */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nº nota fiscal <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    name="invoiceNumber"
                    required
                    className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
                    placeholder="NF-001234"
                  />
                  <button
                    type="button"
                    onClick={() => invoiceFileRef.current?.click()}
                    title={invoiceFileName ?? "Anexar nota fiscal"}
                    className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border transition ${
                      invoiceFileName
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600"
                    }`}
                  >
                    <Paperclip size={14} />
                  </button>
                  <input
                    ref={invoiceFileRef}
                    name="invoiceFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => setInvoiceFileName(e.target.files?.[0]?.name ?? null)}
                  />
                </div>
                {invoiceFileName && (
                  <p className="text-[10px] text-blue-600 truncate mt-0.5">{invoiceFileName}</p>
                )}
              </div>

              {/* Forma de pagamento */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pagamento <span className="text-red-500">*</span>
                </label>
                <select
                  name="paymentMethod"
                  required
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                >
                  <option value="">Selecione...</option>
                  <option value="cash">Dinheiro</option>
                  <option value="pix">Pix</option>
                  <option value="debit">Débito</option>
                  <option value="credit">Crédito</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="purchaseStatus"
                  required
                  defaultValue="received"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
                >
                  <option value="received">Recebida</option>
                  <option value="confirmed">Em andamento</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

            </div>
          </div>

          {/* Itens da compra */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 lg:flex-1 lg:min-h-0">
            <h2 className="shrink-0 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Itens da compra
            </h2>

            {/* Linha de adicionar item */}
            <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              {/* Produto (combobox) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Produto</label>

                {/* Produto pendente: mostra badge no lugar do combobox */}
                {selectedPendingProduct ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 font-medium">
                      <span className="text-[10px] bg-amber-200 text-amber-700 rounded px-1 py-0.5 font-semibold shrink-0">NOVO</span>
                      <span className="truncate">{selectedPendingProduct.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductEditModalOpen(true)}
                      title="Editar nome do produto"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 transition shrink-0"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSelectedProductId(""); setSelectedVariantId(""); setProductSearch(""); }}
                      title="Cancelar"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-400 transition shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    {/* Combobox */}
                    <div className="flex-1 relative" ref={productComboRef}>
                      <button
                        type="button"
                        onClick={() => { setProductComboOpen((o) => !o); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <span className={selectedProduct ? "text-slate-800 truncate" : "text-slate-400"}>
                          {selectedProduct?.name ?? "Selecione o produto..."}
                        </span>
                        <ChevronDown size={13} className="text-slate-400 shrink-0" />
                      </button>
                      {productComboOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                          <div className="p-2 border-b border-slate-100">
                            <input
                              autoFocus
                              type="text"
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              placeholder="Buscar produto..."
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {filteredProducts.length > 0 ? filteredProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.id);
                                  setSelectedVariantId("");
                                  setProductComboOpen(false);
                                  setProductSearch("");
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition ${selectedProductId === p.id ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-800"}`}
                              >
                                {p.name}
                              </button>
                            )) : (
                              <p className="px-3 py-2 text-sm text-slate-400">Nenhum produto encontrado</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setProductModalOpen(true)}
                      title="Cadastrar novo produto"
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Detalhes (variação) */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Detalhes</label>
                {selectedPendingProduct ? (
                  <button
                    type="button"
                    onClick={() => setVariantModalOpen(true)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-600 hover:bg-blue-50 transition font-medium"
                  >
                    <Plus size={14} />
                    Adicionar cor e tamanhos
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      disabled={!selectedProduct}
                      className="flex-1 min-w-0 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Selecione...</option>
                      {selectedProduct?.variants.map((v) => (
                        <option key={v.id} value={v.id}>{v.color} · {v.size}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setVariantModalOpen(true)}
                      disabled={!selectedProductId}
                      title={selectedProductId ? "Adicionar cor/tamanho" : "Selecione um produto primeiro"}
                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Botão */}
              <button
                type="button"
                onClick={handleAddClick}
                disabled={!selectedVariantId}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:bg-slate-50 disabled:text-slate-300 transition whitespace-nowrap self-end"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>

            {/* Tabela */}
            <div className="lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
              {items.length > 0 ? (
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left border-b border-slate-100">
                        <th className="px-4 py-2 font-medium text-slate-500 text-xs uppercase tracking-wide">Produto / Detalhes</th>
                        <th className="px-4 py-2 font-medium text-slate-500 text-xs uppercase tracking-wide text-center">Qtd.</th>
                        <th className="px-4 py-2 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Custo unit.</th>
                        <th className="px-4 py-2 font-medium text-slate-500 text-xs uppercase tracking-wide text-right">Subtotal</th>
                        <th className="px-4 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((item) => {
                        const isEditing = editingItemKey === item.itemKey;
                        return (
                          <tr key={item.itemKey} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2">
                              <p className="font-medium text-slate-900">{item.productName}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleImageEdit(item.itemKey)}
                                  disabled={uploadingImageForKey === item.itemKey}
                                  title="Trocar imagem"
                                  className="group relative w-5 shrink-0 rounded overflow-hidden bg-slate-100 focus:outline-none"
                                  style={{ aspectRatio: "3/4" }}
                                >
                                  {item.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.imageUrl} alt={item.label} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-slate-100" />
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                                    {uploadingImageForKey === item.itemKey ? (
                                      <div className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Camera size={8} className="text-white opacity-0 group-hover:opacity-100 transition" />
                                    )}
                                  </div>
                                </button>
                                <p className="text-xs text-slate-400">{item.label}</p>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center text-slate-600">
                              {isEditing ? (
                                <input
                                  type="number"
                                  min="1"
                                  value={editQty}
                                  onChange={(e) => setEditQty(Number(e.target.value))}
                                  className="w-16 px-2 py-1 border border-blue-300 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                item.quantity
                              )}
                            </td>
                            <td className="px-4 py-2 text-right text-slate-600">
                              {isEditing ? (
                                <CurrencyInput
                                  name=""
                                  value={editUnitCost}
                                  onChange={setEditUnitCost}
                                  className="w-28 px-2 py-1 border border-blue-300 rounded-md text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              ) : (
                                formatCurrency(item.unitCost)
                              )}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-slate-900">
                              {formatCurrency(isEditing ? editQty * editUnitCost : item.quantity * item.unitCost)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={saveEdit} className="text-green-500 hover:text-green-600 transition">
                                    <Check size={14} />
                                  </button>
                                  <button type="button" onClick={cancelEdit} className="text-slate-300 hover:text-slate-500 transition">
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => startEdit(item)} className="text-slate-300 hover:text-blue-400 transition">
                                    <Pencil size={14} />
                                  </button>
                                  <button type="button" onClick={() => removeItem(item.itemKey)} className="text-slate-300 hover:text-red-400 transition">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center border border-dashed border-slate-200 rounded-lg">
                  <ShoppingCart size={20} className="mx-auto mb-1.5 text-slate-300" />
                  <p className="text-sm text-slate-400">Nenhum item adicionado</p>
                </div>
              )}
            </div>

            {/* Observações */}
            <div className="shrink-0 border-t border-slate-100 pt-3">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Observações</label>
              <textarea
                name="notes"
                rows={2}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 placeholder:text-slate-400"
                placeholder="Ex: Blusa Regata Branca rasgada."
              />
            </div>
          </div>
        </div>

        {/* ── Coluna lateral ────────────────────────────────── */}
        <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col gap-3 lg:overflow-y-auto">

          {/* Custos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Custos</h2>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Valor da Compra</label>
              <div className="w-full px-3 py-1.5 border border-slate-100 rounded-lg text-sm bg-slate-50 text-slate-500 select-none">
                {formatCurrency(productsCost)}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Frete</label>
              <CurrencyInput
                name="freightCost"
                value={freightCost}
                onChange={setFreightCost}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>
            <input type="hidden" name="otherCosts" value={0} />
          </div>

          {/* Resumo */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resumo</h2>

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>{totalItems} peça{totalItems !== 1 ? "s" : ""}</span>
                <span>{formatCurrency(productsCost)}</span>
              </div>
              {freightCost > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>Frete</span>
                  <span>{formatCurrency(freightCost)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-slate-700">Total da compra</span>
                <span className="text-lg font-bold text-slate-900">{formatCurrency(totalCost)}</span>
              </div>
              {totalItems > 0 && (
                <p className="text-xs text-slate-400 text-right mt-0.5">
                  {formatCurrency(totalCost / totalItems)} / peça (custo médio)
                </p>
              )}
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-2">
            {state.error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {state.error}
              </p>
            )}
            <SubmitButton />
            <Link
              href="/compras"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 font-medium py-1 transition"
            >
              Cancelar
            </Link>
          </div>
        </div>

        {/* Input oculto para upload de imagem de item da lista */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        {/* Hidden inputs com dados pendentes e itens serializados */}
        <input type="hidden" name="pendingProducts" value={JSON.stringify(pendingProducts)} />
        <input type="hidden" name="pendingVariants" value={JSON.stringify(pendingVariants)} />
        <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
          unitCost: i.unitCost,
        })))} />
      </form>
    </>
  );
}

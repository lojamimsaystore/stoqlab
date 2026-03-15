"use client";

import { Printer } from "lucide-react";
import { formatCurrency } from "@stoqlab/utils";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Cartão de débito",
  credit: "Cartão de crédito",
  installment: "Cartão de crédito",
};

const CHANNEL_LABELS: Record<string, string> = {
  store: "Loja física",
  whatsapp: "WhatsApp",
  ecommerce: "E-commerce",
  marketplace: "Marketplace",
};

type ReceiptItem = {
  productName: string;
  color: string;
  size: string;
  quantity: number;
  salePrice: number;
  finalPrice: number;
};

type ReceiptProps = {
  tenantName: string;
  locationName: string;
  customerName: string | null;
  soldAt: string;
  paymentMethod: string;
  channel: string;
  totalValue: number;
  discountValue: number;
  notes: string | null;
  items: ReceiptItem[];
};

function parseInstallmentInfo(notes: string | null) {
  if (!notes) return { installments: 1, hasInterest: false, cleanNotes: null };
  const match = notes.match(/^(\d+)x (com|sem) juros(?:\s*\|\s*(.*))?$/s);
  if (match) {
    return {
      installments: parseInt(match[1]!),
      hasInterest: match[2] === "com",
      cleanNotes: match[3]?.trim() || null,
    };
  }
  return { installments: 1, hasInterest: false, cleanNotes: notes };
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

function Separator() {
  return (
    <div className="border-t border-dashed border-slate-300 my-3" />
  );
}

export function Receipt(props: ReceiptProps) {
  const { tenantName, locationName, customerName, soldAt, paymentMethod, channel,
    totalValue, discountValue, notes, items } = props;

  const { installments, hasInterest, cleanNotes } = parseInstallmentInfo(notes);
  const { date, time } = formatDateTime(soldAt);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.salePrice, 0);
  const isInstallment = installments > 1;
  const installmentValue = isInstallment ? totalValue / installments : null;

  return (
    <>
      {/* Botão imprimir — oculto na impressão */}
      <button
        onClick={() => window.print()}
        className="print:hidden flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
      >
        <Printer size={15} />
        Imprimir comprovante
      </button>

      {/* Comprovante */}
      <div
        id="receipt"
        className="bg-white border border-slate-200 rounded-xl overflow-hidden print:border-0 print:rounded-none print:shadow-none"
      >
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-dashed border-slate-200">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Comprovante de Venda</p>
          <h2 className="text-xl font-bold text-slate-900">{tenantName}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{locationName}</p>
        </div>

        {/* Meta da venda */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
            <div className="text-slate-500">Data</div>
            <div className="text-slate-900 font-medium text-right">{date}</div>
            <div className="text-slate-500">Hora</div>
            <div className="text-slate-900 font-medium text-right">{time}</div>
            {customerName && (
              <>
                <div className="text-slate-500">Cliente</div>
                <div className="text-slate-900 font-medium text-right truncate">{customerName}</div>
              </>
            )}
            <div className="text-slate-500">Canal</div>
            <div className="text-slate-900 font-medium text-right">{CHANNEL_LABELS[channel] ?? channel}</div>
          </div>
        </div>

        <Separator />

        {/* Itens */}
        <div className="px-6 space-y-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Itens</p>
          {items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 leading-snug">{item.productName}</p>
                <p className="text-xs text-slate-400">{item.color} · {item.size}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-slate-900">
                  {formatCurrency(item.finalPrice * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[10px] text-slate-400">
                    {item.quantity}x {formatCurrency(item.finalPrice)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <Separator />

        {/* Totais */}
        <div className="px-6 space-y-1.5 text-sm">
          {discountValue > 0 && (
            <>
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>Desconto</span>
                <span className="tabular-nums">− {formatCurrency(discountValue)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-1">
            <span className="font-bold text-slate-900 text-base">Total</span>
            <span className="font-bold text-emerald-700 text-xl tabular-nums">
              {formatCurrency(totalValue)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Pagamento */}
        <div className="px-6 pb-2 space-y-1.5 text-sm">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Pagamento</p>
          <div className="flex justify-between">
            <span className="text-slate-500">Forma</span>
            <span className="font-medium text-slate-900">{PAYMENT_LABELS[paymentMethod] ?? paymentMethod}</span>
          </div>
          {isInstallment && (
            <>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcelas</span>
                <span className="font-medium text-slate-900">
                  {installments}x {hasInterest ? "com juros" : "sem juros"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor por parcela</span>
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(installmentValue!)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Observações (sem prefixo de parcelas) */}
        {cleanNotes && (
          <>
            <Separator />
            <div className="px-6 pb-4">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Observações</p>
              <p className="text-sm text-slate-600">{cleanNotes}</p>
            </div>
          </>
        )}

        {/* Rodapé */}
        <div className="px-6 py-5 text-center border-t border-dashed border-slate-200 mt-4">
          <p className="text-sm text-slate-500">Obrigado pela preferência!</p>
        </div>
      </div>
    </>
  );
}

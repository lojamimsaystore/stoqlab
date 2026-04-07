"use client";

import { useState } from "react";
import { X, UserPlus, User, Loader2, AlertCircle } from "lucide-react";
import { checkCustomerDuplicateAction } from "../actions";

export type NewCustomerData = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birthdate: string;
  address: string;
};

type Props = {
  initial?: NewCustomerData;
  onConfirm: (data: NewCustomerData) => void;
  onClose: () => void;
};

function formatCpf(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const FIELD_LABELS: Record<string, string> = {
  cpf:   "CPF",
  phone: "Telefone",
  email: "E-mail",
};

export function NewCustomerModal({ initial, onConfirm, onClose }: Props) {
  const [name,      setName]      = useState(initial?.name      ?? "");
  const [cpf,       setCpf]       = useState(initial?.cpf       ?? "");
  const [phone,     setPhone]     = useState(initial?.phone     ?? "");
  const [email,     setEmail]     = useState(initial?.email     ?? "");
  const [birthdate, setBirthdate] = useState(initial?.birthdate ?? "");
  const [address,   setAddress]   = useState(initial?.address   ?? "");

  const [errors,  setErrors]  = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    const fieldErrors: string[] = [];
    if (!name.trim()) fieldErrors.push("Nome é obrigatório.");
    else if (name.trim().split(/\s+/).filter(Boolean).length < 2)
      fieldErrors.push("Informe o nome completo (nome e sobrenome).");
    if (fieldErrors.length > 0) { setErrors(fieldErrors); return; }

    setLoading(true);
    setErrors([]);

    try {
      const conflicts = await checkCustomerDuplicateAction({ cpf, phone, email });
      if (conflicts.length > 0) {
        setErrors(
          conflicts.map(
            (c) =>
              `${FIELD_LABELS[c.field]} já cadastrado para o cliente "${c.customerName}".`
          )
        );
        return;
      }
    } finally {
      setLoading(false);
    }

    onConfirm({ name: name.trim(), cpf, phone, email, birthdate, address });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <UserPlus size={16} className="text-blue-600" />
          </div>
          <h2 className="font-semibold text-slate-900 text-sm flex-1">Novo cliente</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Campos */}
        <div className="p-5 space-y-3">

          {/* Nome */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors([]); }}
                placeholder="Ex: Maria Silva"
                autoCapitalize="words"
                style={{ textTransform: "none" }}
                className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* CPF + Telefone */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CPF</label>
              <input
                value={cpf}
                onChange={(e) => { setCpf(formatCpf(e.target.value)); setErrors([]); }}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
              <input
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setErrors([]); }}
                placeholder="(00) 00000-0000"
                inputMode="numeric"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* E-mail */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors([]); }}
              placeholder="email@exemplo.com"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
            />
          </div>

          {/* Nascimento + Endereço */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nascimento</label>
              <input
                type="date"
                value={birthdate}
                onChange={(e) => setBirthdate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número…"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
              />
            </div>
          </div>

          {/* Erros */}
          {errors.length > 0 && (
            <div className="space-y-1.5">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  {err}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={14} className="animate-spin" /> Verificando…</> : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

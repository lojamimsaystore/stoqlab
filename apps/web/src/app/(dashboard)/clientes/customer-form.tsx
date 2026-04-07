"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import type { CustomerState, CustomerSuggestion } from "./actions";
import { searchCustomersByNameAction } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition">
      {pending ? "Salvando..." : label}
    </button>
  );
}

type Customer = {
  name: string;
  phone?: string | null;
  email?: string | null;
  cpf?: string | null;
  birthdate?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function CustomerForm({
  action, defaultValues, submitLabel,
}: {
  action: (prev: CustomerState, formData: FormData) => Promise<CustomerState>;
  defaultValues?: Customer;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});

  // Autocomplete de nome
  const [nameValue, setNameValue] = useState(defaultValues?.name ?? "");
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setNameValue(value);
    setShowDropdown(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await searchCustomersByNameAction(value.trim());
      setSuggestions(results);
      setShowDropdown(results.length > 0);
    }, 250);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setShowDropdown(false);
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Campo Nome com autocomplete */}
        <div className="sm:col-span-2 relative" ref={wrapperRef}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            value={nameValue}
            onChange={handleNameChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Maria Silva"
            autoCapitalize="words"
            style={{ textTransform: "none" }}
            autoComplete="off"
          />

          {/* Dropdown de sugestões */}
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Clientes encontrados
              </p>
              {suggestions.map((s) => (
                <Link
                  key={s.id}
                  href={`/clientes/${s.id}/editar`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 transition-colors border-t border-slate-100 first:border-0"
                  onClick={() => setShowDropdown(false)}
                >
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User size={13} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                    {s.phone && (
                      <p className="text-xs text-slate-400">{s.phone}</p>
                    )}
                  </div>
                  <span className="text-xs text-blue-500 font-medium shrink-0">Ver perfil</span>
                </Link>
              ))}
              <p className="px-3 py-2 text-[11px] text-slate-400 border-t border-slate-100 bg-slate-50">
                Não encontrou? Continue digitando para criar um novo cliente.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
          <input name="phone" defaultValue={defaultValues?.phone ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input name="email" type="email" defaultValue={defaultValues?.email ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
          <input name="cpf" defaultValue={defaultValues?.cpf ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data de nascimento</label>
          <input name="birthdate" type="date" defaultValue={defaultValues?.birthdate ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
          <input name="address" defaultValue={defaultValues?.address ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rua, número, bairro, cidade..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
          <textarea name="notes" defaultValue={defaultValues?.notes ?? ""} rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Preferências, histórico, informações adicionais..." />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton label={submitLabel} />
        <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</Link>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";

type SupplierDefaults = {
  name?: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  complement?: string | null;
  notes?: string | null;
};

function PhoneFields({ defaultValue }: { defaultValue?: string | null }) {
  // Existing phone stored as combined digits e.g. "11987654321"
  const allDigits = (defaultValue ?? "").replace(/\D/g, "");
  const [ddd, setDdd] = useState(allDigits.slice(0, 2));
  const [number, setNumber] = useState(allDigits.slice(2));

  const combined = ddd + number;

  return (
    <>
      <input type="hidden" name="phone" value={combined} />
      <div className="w-20">
        <label className="block text-sm font-medium text-slate-700 mb-1">DDD</label>
        <input
          value={ddd}
          onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          maxLength={2}
          placeholder="11"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
          inputMode="numeric"
          minLength={8}
          maxLength={9}
          placeholder="900000000"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}

function formatCpfCnpj(digits: string): string {
  if (digits.length <= 11) {
    // CPF: xxx.xxx.xxx-xx
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: xx.xxx.xxx/xxxx-xx
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function CpfCnpjInput({ defaultValue }: { defaultValue?: string | null }) {
  const [value, setValue] = useState(defaultValue ?? "");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 14);
    setValue(digits.length === 0 ? "" : formatCpfCnpj(digits));
  }

  return (
    <input
      name="cnpj"
      value={value}
      onChange={handleChange}
      inputMode="numeric"
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="CPF ou CNPJ"
    />
  );
}

function NameInput({ defaultValue }: { defaultValue?: string }) {
  const [value, setValue] = useState((defaultValue ?? "").toUpperCase());
  return (
    <input
      name="name"
      required
      value={value}
      onChange={(e) => setValue(e.target.value.toUpperCase())}
      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="NOME DO FORNECEDOR"
    />
  );
}

export function SupplierFields({ defaultValues }: { defaultValues?: SupplierDefaults }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nome <span className="text-red-500">*</span>
        </label>
        <NameInput defaultValue={defaultValues?.name} />
      </div>

      {/* CPF/CNPJ + DDD + Telefone na mesma linha */}
      <div className="sm:col-span-2">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">CPF/CNPJ</label>
            <CpfCnpjInput defaultValue={defaultValues?.cnpj} />
          </div>
          <PhoneFields defaultValue={defaultValues?.phone} />
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
        <input
          name="email"
          type="email"
          defaultValue={defaultValues?.email ?? ""}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="contato@fornecedor.com"
        />
      </div>

      <div className="sm:col-span-2">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
            <input
              name="address"
              defaultValue={defaultValues?.address ?? ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Rua, número, cidade..."
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Complemento</label>
            <input
              name="complement"
              defaultValue={defaultValues?.complement ?? ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Apto, sala..."
            />
          </div>
        </div>
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
        <textarea
          name="notes"
          defaultValue={defaultValues?.notes ?? ""}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Condições de pagamento, prazo de entrega..."
        />
      </div>
    </div>
  );
}

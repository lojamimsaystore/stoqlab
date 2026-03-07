"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

type Category = { id: string; name: string };

type Product = {
  id: string;
  name: string;
  brand: string | null;
  description: string | null;
  status: string;
  category_id: string | null;
};

type ProductFormProps = {
  action: (prev: { error?: string }, formData: FormData) => Promise<{ error?: string }>;
  categories: Category[];
  product?: Product;
  cancelHref: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

export function ProductForm({
  action,
  categories,
  product,
  cancelHref,
}: ProductFormProps) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome do produto <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            defaultValue={product?.name}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Blusa Feminina Básica"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Marca
          </label>
          <input
            name="brand"
            defaultValue={product?.brand ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Zara"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Categoria
          </label>
          <select
            name="categoryId"
            defaultValue={product?.category_id ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descrição
          </label>
          <textarea
            name="description"
            defaultValue={product?.description ?? ""}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descrição opcional do produto..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Status
          </label>
          <select
            name="status"
            defaultValue={product?.status ?? "active"}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="active">Ativo</option>
            <option value="draft">Rascunho</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <SubmitButton label={product ? "Salvar alterações" : "Criar e adicionar variações"} />
        <Link
          href={cancelHref}
          className="text-sm text-slate-500 hover:text-slate-700 font-medium"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

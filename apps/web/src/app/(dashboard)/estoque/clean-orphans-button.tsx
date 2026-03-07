"use client";

import { useRouter } from "next/navigation";
import { cleanOrphanVariantsAction } from "../produtos/actions";

export function CleanOrphansButton({ count }: { count: number }) {
  const router = useRouter();

  if (count === 0) return null;

  async function handle() {
    await cleanOrphanVariantsAction();
    router.refresh();
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-800">
        ⚠️ {count} variação(ões) de produtos deletados ainda aparecem no estoque.
      </p>
      <button
        onClick={handle}
        className="shrink-0 text-sm font-medium text-amber-700 hover:text-amber-900 underline"
      >
        Limpar agora
      </button>
    </div>
  );
}

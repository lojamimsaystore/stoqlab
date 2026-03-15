"use client";

import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";
import { toggleProductArchiveAction } from "../actions";

export function ArchiveProductButton({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isArchived = status === "archived";

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(() => toggleProductArchiveAction(id, status));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={isArchived ? "Restaurar produto" : "Arquivar produto"}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isArchived
          ? "text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
          : "text-slate-400 hover:bg-amber-50 hover:text-amber-500"
      }`}
    >
      {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
    </button>
  );
}

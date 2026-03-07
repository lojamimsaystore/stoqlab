"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCustomerAction } from "./actions";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  async function handle() {
    if (!confirm(`Remover cliente "${name}"?`)) return;
    await deleteCustomerAction(id);
    router.refresh();
  }
  return (
    <button onClick={handle} className="text-slate-400 hover:text-red-600 transition-colors">
      <Trash2 size={16} />
    </button>
  );
}

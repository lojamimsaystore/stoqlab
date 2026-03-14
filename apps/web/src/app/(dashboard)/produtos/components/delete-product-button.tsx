"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { deleteProductAction } from "../actions";

export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      itemName={name}
      title="Excluir produto?"
      description={`O produto "${name}" e todas as suas variações serão removidos. Esta ação não pode ser desfeita.`}
      successMessage={`Produto "${name}" removido com sucesso`}
      onConfirm={() => deleteProductAction(id)}
      onSuccess={() => router.refresh()}
      iconSize={14}
    />
  );
}

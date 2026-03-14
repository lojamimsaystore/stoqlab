"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { deleteSupplierAction } from "./actions";

export function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      itemName={name}
      title="Remover fornecedor?"
      description={`O fornecedor "${name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
      successMessage={`Fornecedor "${name}" removido com sucesso`}
      onConfirm={() => deleteSupplierAction(id)}
      onSuccess={() => router.refresh()}
    />
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { deletePurchaseAction } from "./actions";

export function DeletePurchaseButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      itemName="esta compra"
      title="Remover compra?"
      description="A compra será removida permanentemente. Atenção: o estoque não será revertido automaticamente."
      successMessage="Compra removida com sucesso"
      onConfirm={() => deletePurchaseAction(id)}
      onSuccess={() => router.refresh()}
    />
  );
}

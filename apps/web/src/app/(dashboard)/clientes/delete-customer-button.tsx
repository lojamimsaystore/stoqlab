"use client";

import { useRouter } from "next/navigation";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";
import { deleteCustomerAction } from "./actions";

export function DeleteCustomerButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDeleteDialog
      itemName={name}
      title="Remover cliente?"
      description={`O cliente "${name}" será removido permanentemente. Esta ação não pode ser desfeita.`}
      successMessage={`Cliente "${name}" removido com sucesso`}
      onConfirm={() => deleteCustomerAction(id)}
      onSuccess={() => router.refresh()}
    />
  );
}

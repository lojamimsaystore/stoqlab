"use client";

import { useState, useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ConfirmDeleteDialogProps = {
  /** Nome do item a ser removido (usado na mensagem) */
  itemName: string;
  /** Texto do título do modal. Ex: "Remover cliente?" */
  title?: string;
  /** Texto da descrição. Se omitido, usa padrão. */
  description?: string;
  /** Ação a executar ao confirmar. Deve retornar { error?: string } ou void. */
  onConfirm: () => Promise<{ error?: string } | void>;
  /** Mensagem de sucesso exibida no toast */
  successMessage?: string;
  /** Estilo do trigger: "icon" (lixeira) ou "text" */
  trigger?: "icon" | "text";
  /** Tamanho do ícone (default 16) */
  iconSize?: number;
  /** Ação adicional após sucesso (ex: router.refresh()) */
  onSuccess?: () => void;
};

export function ConfirmDeleteDialog({
  itemName,
  title,
  description,
  onConfirm,
  successMessage,
  trigger = "icon",
  iconSize = 16,
  onSuccess,
}: ConfirmDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage ?? `"${itemName}" removido com sucesso`);
      setOpen(false);
      onSuccess?.();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {trigger === "icon" ? (
          <button
            aria-label={`Remover ${itemName}`}
            className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
          >
            <Trash2 size={iconSize} />
          </button>
        ) : (
          <button
            aria-label={`Remover ${itemName}`}
            className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Remover
          </button>
        )}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? `Remover "${itemName}"?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `Esta ação não pode ser desfeita. O item "${itemName}" será removido permanentemente.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Removendo…
              </>
            ) : (
              "Sim, remover"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

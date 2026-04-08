"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

const transferSchema = z.object({
  fromLocationId: z.string().uuid("Origem obrigatória"),
  toLocationId: z.string().uuid("Destino obrigatório"),
  notes: z.string().max(300).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
}).refine((d) => d.fromLocationId !== d.toLocationId, {
  message: "Origem e destino não podem ser iguais",
});

export type TransferState = { error?: string };

export async function createTransferAction(
  _prev: TransferState,
  formData: FormData
): Promise<TransferState> {
  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = transferSchema.safeParse({
    fromLocationId: formData.get("fromLocationId"),
    toLocationId: formData.get("toLocationId"),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { fromLocationId, toLocationId, notes } = parsed.data;

  // Valida estoque disponível na origem
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", fromLocationId)
      .single();

    if (!inv || inv.quantity < item.quantity) {
      return { error: "Estoque insuficiente na origem para um dos itens." };
    }
  }

  // Cria a transferência
  const { data: transfer, error: transferError } = await supabaseAdmin
    .from("stock_transfers")
    .insert({
      tenant_id: tenantId,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      status: "received",
      notes: notes ?? null,
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (transferError) return { error: "Erro ao registrar transferência." };

  // Cria itens da transferência
  await supabaseAdmin.from("transfer_items").insert(
    parsed.data.items.map((i) => ({
      transfer_id: transfer.id,
      variant_id: i.variantId,
      quantity: i.quantity,
    }))
  );

  // Movimenta estoque
  for (const item of parsed.data.items) {
    // Subtrai da origem
    const { data: fromInv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", fromLocationId)
      .single();

    if (fromInv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: fromInv.quantity - item.quantity })
        .eq("id", fromInv.id);
    }

    // Adiciona no destino (upsert)
    const { data: toInv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", toLocationId)
      .single();

    if (toInv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: toInv.quantity + item.quantity })
        .eq("id", toInv.id);
    } else {
      await supabaseAdmin.from("inventory").insert({
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: toLocationId,
        quantity: item.quantity,
      });
    }

    // Movimentos
    await supabaseAdmin.from("inventory_movements").insert([
      {
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: fromLocationId,
        quantity_delta: -item.quantity,
        movement_type: "transfer",
        reference_id: transfer.id,
        note: `Transferência para ${toLocationId}`,
      },
      {
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: toLocationId,
        quantity_delta: item.quantity,
        movement_type: "transfer",
        reference_id: transfer.id,
        note: `Recebido de ${fromLocationId}`,
      },
    ]);
  }

  revalidatePath("/transferencias");
  revalidatePath("/estoque");
  redirect("/transferencias");
}

export async function deleteTransferAction(
  transferId: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  // Verifica que a transferência pertence ao tenant
  const { data: transfer } = await supabaseAdmin
    .from("stock_transfers")
    .select("id, from_location_id, to_location_id, status")
    .eq("id", transferId)
    .eq("tenant_id", tenantId)
    .single();

  if (!transfer) return { error: "Transferência não encontrada." };

  // Busca os itens para reverter o estoque
  const { data: items } = await supabaseAdmin
    .from("transfer_items")
    .select("variant_id, quantity")
    .eq("transfer_id", transferId);

  // Reverte estoque apenas se foi recebida (afetou o estoque)
  if (transfer.status === "received" && items?.length) {
    for (const item of items) {
      // Devolve à origem
      const { data: fromInv } = await supabaseAdmin
        .from("inventory")
        .select("id, quantity")
        .eq("variant_id", item.variant_id)
        .eq("location_id", transfer.from_location_id)
        .single();

      if (fromInv) {
        await supabaseAdmin
          .from("inventory")
          .update({ quantity: fromInv.quantity + item.quantity })
          .eq("id", fromInv.id);
      }

      // Subtrai do destino
      const { data: toInv } = await supabaseAdmin
        .from("inventory")
        .select("id, quantity")
        .eq("variant_id", item.variant_id)
        .eq("location_id", transfer.to_location_id)
        .single();

      if (toInv) {
        await supabaseAdmin
          .from("inventory")
          .update({ quantity: Math.max(0, toInv.quantity - item.quantity) })
          .eq("id", toInv.id);
      }
    }
  }

  await writeAuditLog({
    tenantId,
    action: "transfer.deleted",
    tableName: "stock_transfers",
    recordId: transferId,
    oldData: { ...transfer, items } as unknown as Record<string, unknown>,
  });

  await supabaseAdmin.from("inventory_movements").delete().eq("reference_id", transferId);
  await supabaseAdmin.from("transfer_items").delete().eq("transfer_id", transferId);
  await supabaseAdmin.from("stock_transfers").delete().eq("id", transferId).eq("tenant_id", tenantId);

  revalidatePath("/transferencias");
  revalidatePath("/estoque");
  return {};
}

export async function createLocationAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "store";

  if (!name) return { error: "Nome obrigatório" };

  const { error } = await supabaseAdmin.from("locations").insert({
    tenant_id: tenantId,
    name,
    type,
  });

  if (error) return { error: "Erro ao criar localização." };

  revalidatePath("/transferencias");
  return {};
}

"use client";

import { useState, useTransition } from "react";
import { updatePurchaseStatusAction } from "./actions";

type Status = "received" | "confirmed" | "cancelled";

const STATUS_LABEL: Record<Status, string> = {
  received: "Recebida",
  confirmed: "Em andamento",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<Status, string> = {
  received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  confirmed: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

const KNOWN_STATUSES: Status[] = ["received", "confirmed", "cancelled"];

function toKnownStatus(s: string): Status {
  return KNOWN_STATUSES.includes(s as Status) ? (s as Status) : "confirmed";
}

export function PurchaseStatusSelect({
  id,
  status: initialStatus,
}: {
  id: string;
  status: string;
}) {
  const [status, setStatus] = useState<Status>(toKnownStatus(initialStatus));
  const [isPending, startTransition] = useTransition();

  function handleChange(newStatus: Status) {
    setStatus(newStatus);
    startTransition(async () => {
      await updatePurchaseStatusAction(id, newStatus);
    });
  }

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value as Status)}
      disabled={isPending}
      className={`text-xs font-medium px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${STATUS_COLOR[status]} ${isPending ? "opacity-50" : ""}`}
    >
      {KNOWN_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

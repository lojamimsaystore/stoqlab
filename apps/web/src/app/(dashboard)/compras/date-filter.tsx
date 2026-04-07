"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";

  function update(from: string, to: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("dateFrom", from);
    else params.delete("dateFrom");
    if (to) params.set("dateTo", to);
    else params.delete("dateTo");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => update(e.target.value, dateTo)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Data inicial"
        title="Data inicial"
      />
      <span className="text-slate-400 text-xs">até</span>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => update(dateFrom, e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Data final"
        title="Data final"
      />
    </div>
  );
}

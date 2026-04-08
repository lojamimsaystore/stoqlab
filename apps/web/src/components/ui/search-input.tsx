"use client";

import { Search, X } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  placeholder?: string;
  paramName?: string;
  className?: string;
  ariaLabel?: string;
};

export function SearchInput({
  placeholder = "Buscar…",
  paramName = "q",
  className,
  ariaLabel,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get(paramName) ?? "";
  const [value, setValue] = useState(currentValue);

  function handleChange(newValue: string) {
    setValue(newValue);
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set(paramName, newValue);
    } else {
      params.delete(paramName);
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        size={15}
        aria-hidden="true"
        className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
          isPending ? "text-blue-500 animate-pulse" : "text-slate-400"
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        aria-busy={isPending}
        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => handleChange("")}
          aria-label="Limpar busca"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

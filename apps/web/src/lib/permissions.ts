export const MODULES = [
  { key: "dashboard",      label: "Dashboard",      short: "Dashboard"   },
  { key: "produtos",       label: "Produtos",        short: "Produtos"    },
  { key: "categorias",     label: "Categorias",      short: "Categorias"  },
  { key: "estoque",        label: "Estoque",         short: "Estoque"     },
  { key: "compras",        label: "Compras",         short: "Compras"     },
  { key: "vendas",         label: "Vendas",          short: "Vendas"      },
  { key: "transferencias", label: "Transferências",  short: "Transf."     },
  { key: "fornecedores",   label: "Fornecedores",    short: "Fornec."     },
  { key: "clientes",       label: "Clientes",        short: "Clientes"    },
  { key: "relatorios",     label: "Relatórios",      short: "Relat."      },
  { key: "configuracoes",  label: "Configurações",   short: "Config."     },
] as const;

export type ModuleKey = typeof MODULES[number]["key"];

export const CONFIGURABLE_ROLES = ["manager", "seller", "stock_operator"] as const;
export type ConfigurableRole = typeof CONFIGURABLE_ROLES[number];

export const ROLE_META: Record<ConfigurableRole, { label: string; description: string }> = {
  manager:        { label: "Gerente",              description: "Operações gerais da loja"         },
  seller:         { label: "Vendedor",             description: "Atendimento e ponto de venda"     },
  stock_operator: { label: "Operador de Estoque",  description: "Entradas e movimentações físicas" },
};

/** Defaults aplicados quando o proprietário ainda não configurou permissões */
export const DEFAULT_PERMISSIONS: Record<ConfigurableRole, ModuleKey[]> = {
  manager: [
    "dashboard", "produtos", "categorias", "estoque",
    "compras", "vendas", "transferencias", "fornecedores",
    "clientes", "relatorios",
  ],
  seller: [
    "dashboard", "produtos", "vendas",
  ],
  stock_operator: [
    "dashboard", "estoque", "compras", "transferencias",
  ],
};

/**
 * Resolve a lista de módulos permitidos para um dado papel,
 * mesclando configurações salvas com defaults.
 */
export function resolvePermissions(
  role: string,
  saved: Record<string, string[]> | null | undefined
): ModuleKey[] {
  if (role === "owner" || role === "master") {
    return MODULES.map((m) => m.key);
  }

  const perms = saved?.[role];
  if (saved && role in saved && Array.isArray(perms)) {
    return perms as ModuleKey[];
  }

  return DEFAULT_PERMISSIONS[role as ConfigurableRole] ?? ["dashboard"];
}

/** Extrai a chave de módulo a partir de um pathname do Next.js */
export function moduleFromPath(pathname: string): ModuleKey | null {
  if (pathname === "/") return "dashboard";
  const segment = pathname.split("/")[1];
  if (!segment) return null;
  return MODULES.find((m) => m.key === segment)?.key ?? null;
}

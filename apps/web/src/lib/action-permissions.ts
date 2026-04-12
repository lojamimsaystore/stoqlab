/**
 * Sistema de permissões granulares por ação e informação.
 * Complementa o controle de módulos (permissions.ts).
 */

// ── Tipos ────────────────────────────────────────────────────────────────────

export const ACTION_KEYS = [
  // Produtos
  "produto.nova_entrada",
  "produto.editar",
  "produto.arquivar",
  "produto.excluir",
  "produto.adicionar_variacao",
  "produto.excluir_variacao",
  // Compras
  "compra.criar",
  "compra.editar",
  "compra.excluir",
  "compra.alterar_status",
  "compra.upload_nf",
  // Vendas
  "venda.criar",
  "venda.cancelar",
  "venda.editar",
  "venda.imprimir",
  // Estoque
  "estoque.ajustar",
  // Transferências
  "transferencia.criar",
  "transferencia.excluir",
  // Fornecedores
  "fornecedor.gerenciar",
  // Clientes
  "cliente.criar",
  "cliente.editar",
  "cliente.excluir",
  "cliente.menu",
  // Devedores
  "devedor.adicionar_pagamento",
  "devedor.aumentar_divida",
  "devedor.excluir",
  // Notificações
  "notificacoes.sino",
  // Informações financeiras
  "info.preco_venda",
  "info.custo_compra",
  "info.custo_real",
  "info.custos_extras",
  "info.total_compra",
  "info.margem",
  "info.desconto",
  "info.faturamento",
  "info.resultado",
  "info.ranking_produtos",
  // Informações pessoais
  "info.saldo_devedor",
  "info.cpf_cliente",
  "info.dados_fornecedor",
] as const;

export type ActionKey = typeof ACTION_KEYS[number];

// ── Grupos para exibição na matriz ───────────────────────────────────────────

export const ACTION_GROUPS: {
  label: string;
  type: "action" | "info";
  items: { key: ActionKey; label: string }[];
}[] = [
  {
    label: "Produtos",
    type: "action",
    items: [
      { key: "produto.nova_entrada",       label: "Registrar nova entrada (compra)" },
      { key: "produto.editar",             label: "Editar produto (nome / foto)" },
      { key: "produto.arquivar",           label: "Arquivar / restaurar produto" },
      { key: "produto.excluir",            label: "Excluir produto" },
      { key: "produto.adicionar_variacao", label: "Adicionar variação" },
      { key: "produto.excluir_variacao",   label: "Excluir variação" },
    ],
  },
  {
    label: "Compras",
    type: "action",
    items: [
      { key: "compra.criar",          label: "Nova compra" },
      { key: "compra.editar",         label: "Editar compra" },
      { key: "compra.excluir",        label: "Excluir compra" },
      { key: "compra.alterar_status", label: "Alterar status da compra" },
      { key: "compra.upload_nf",      label: "Upload de nota fiscal" },
    ],
  },
  {
    label: "Vendas",
    type: "action",
    items: [
      { key: "venda.criar",    label: "Registrar nova venda" },
      { key: "venda.cancelar", label: "Cancelar venda" },
      { key: "venda.editar",   label: "Editar venda" },
      { key: "venda.imprimir", label: "Imprimir recibo" },
    ],
  },
  {
    label: "Estoque",
    type: "action",
    items: [
      { key: "estoque.ajustar", label: "Ajustar estoque" },
    ],
  },
  {
    label: "Transferências",
    type: "action",
    items: [
      { key: "transferencia.criar",   label: "Nova transferência" },
      { key: "transferencia.excluir", label: "Excluir transferência" },
    ],
  },
  {
    label: "Fornecedores",
    type: "action",
    items: [
      { key: "fornecedor.gerenciar", label: "Criar / editar / excluir fornecedor" },
    ],
  },
  {
    label: "Clientes",
    type: "action",
    items: [
      { key: "cliente.criar",   label: "Criar cliente" },
      { key: "cliente.editar",  label: "Editar cliente" },
      { key: "cliente.excluir", label: "Excluir cliente" },
      { key: "cliente.menu",    label: "Menu Clientes (barra lateral)" },
    ],
  },
  {
    label: "Devedores",
    type: "action",
    items: [
      { key: "devedor.adicionar_pagamento", label: "Adicionar pagamento" },
      { key: "devedor.aumentar_divida",     label: "Aumentar dívida" },
      { key: "devedor.excluir",             label: "Excluir dívida / pagamento" },
    ],
  },
  {
    label: "Notificações",
    type: "action",
    items: [
      { key: "notificacoes.sino", label: "Sino de alertas (estoque baixo)" },
    ],
  },
  {
    label: "Informações financeiras",
    type: "info",
    items: [
      { key: "info.preco_venda",      label: "Preço de venda" },
      { key: "info.custo_compra",     label: "Custo unitário de compra" },
      { key: "info.custo_real",       label: "Custo real por peça" },
      { key: "info.custos_extras",    label: "Frete e outros custos" },
      { key: "info.total_compra",     label: "Total investido na compra" },
      { key: "info.margem",           label: "Margem bruta (%)" },
      { key: "info.desconto",         label: "Desconto aplicado na venda" },
      { key: "info.faturamento",      label: "Faturamento do mês / total" },
      { key: "info.resultado",        label: "Resultado bruto (lucro / prejuízo)" },
      { key: "info.ranking_produtos", label: "Produtos mais vendidos (com receita)" },
    ],
  },
  {
    label: "Dados pessoais",
    type: "info",
    items: [
      { key: "info.saldo_devedor",    label: "Saldo devedor do cliente" },
      { key: "info.cpf_cliente",      label: "CPF do cliente" },
      { key: "info.dados_fornecedor", label: "CNPJ / telefone / e-mail do fornecedor" },
    ],
  },
];

// ── Defaults por role ─────────────────────────────────────────────────────────

export const DEFAULT_ACTION_PERMISSIONS: Record<"manager" | "seller" | "stock_operator", ActionKey[]> = {
  manager: [
    "produto.nova_entrada", "produto.editar", "produto.arquivar", "produto.adicionar_variacao",
    "compra.criar", "compra.editar", "compra.alterar_status", "compra.upload_nf",
    "venda.criar", "venda.cancelar", "venda.editar", "venda.imprimir",
    "estoque.ajustar",
    "transferencia.criar",
    "fornecedor.gerenciar", "cliente.criar", "cliente.editar", "cliente.excluir", "cliente.menu",
    "devedor.adicionar_pagamento", "devedor.aumentar_divida",
    "notificacoes.sino",
    "info.preco_venda", "info.custo_compra", "info.custo_real", "info.custos_extras",
    "info.total_compra", "info.margem", "info.desconto", "info.faturamento",
    "info.resultado", "info.ranking_produtos", "info.saldo_devedor",
    "info.cpf_cliente", "info.dados_fornecedor",
  ],
  seller: [
    "venda.criar", "venda.imprimir",
    "cliente.criar",
    "info.preco_venda", "info.desconto",
  ],
  stock_operator: [
    "produto.nova_entrada",
    "compra.criar", "compra.alterar_status", "compra.upload_nf",
    "estoque.ajustar",
    "transferencia.criar",
    "notificacoes.sino",
    "info.preco_venda", "info.custo_compra", "info.total_compra",
  ],
};

// ── Resolver ──────────────────────────────────────────────────────────────────

/**
 * Retorna o Set de ações permitidas para um role.
 * Owner/master têm acesso total implícito (não precisam de consulta).
 */
export function resolveActionPermissions(
  role: string,
  saved: Record<string, ActionKey[]> | null | undefined
): Set<ActionKey> {
  if (role === "owner" || role === "master") {
    return new Set(ACTION_KEYS);
  }

  const savedForRole = saved?.[role];
  if (saved && role in saved && Array.isArray(savedForRole)) {
    return new Set(savedForRole as ActionKey[]);
  }

  const defaultPerms = DEFAULT_ACTION_PERMISSIONS[role as "manager" | "seller" | "stock_operator"];
  return new Set(defaultPerms ?? []);
}

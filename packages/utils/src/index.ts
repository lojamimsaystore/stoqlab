// Helpers, constantes e formatadores compartilhados

/** Formata valor monetário em Real brasileiro */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/** Formata data no padrão brasileiro */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

/** Calcula margem bruta em percentual */
export function calcGrossMargin(totalValue: number, totalCost: number): number {
  if (totalValue <= 0) return 0;
  return Number((((totalValue - totalCost) / totalValue) * 100).toFixed(2));
}

/** Gera slug URL-safe a partir de um texto */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')   // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-')            // espaços -> hífens
    .replace(/-+/g, '-');            // hífens duplos -> simples
}

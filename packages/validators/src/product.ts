import { z } from "zod";

export const SIZES = [
  "PP", "P", "M", "G", "GG", "GGG", "Único",
  "34", "36", "38", "40", "42", "44", "46", "48", "50",
] as const;

export const productSchema = z.object({
  name: z
    .string({ required_error: "Nome obrigatório" })
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200),
  brand: z.string().max(100).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

// Formulário unificado: produto + variação + estoque
export const createProductFullSchema = z.object({
  // Produto
  name: z
    .string({ required_error: "Nome obrigatório" })
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(200),
  categoryId: z.string().uuid("Categoria inválida").optional(),
  description: z.string().max(2000).optional(),

  // Variação
  color: z
    .string({ required_error: "Cor obrigatória" })
    .min(1, "Cor obrigatória")
    .max(60)
    .transform((v) => v.trim().toUpperCase()),
  size: z
    .string({ required_error: "Tamanho obrigatório" })
    .min(1, "Tamanho obrigatório"),

  // Estoque e preço
  quantity: z
    .string()
    .default("0")
    .transform(Number)
    .pipe(z.number().int().min(0, "Quantidade não pode ser negativa")),
  salePrice: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : undefined))
    .pipe(z.number().min(0).optional()),
  costPrice: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : undefined))
    .pipe(z.number().min(0).optional()),

  // Compra
  purchaseDate: z.string().optional(),
});

export const variantSchema = z.object({
  color: z.string().min(1).max(60).transform((v) => v.trim().toUpperCase()),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  size: z.string().min(1).max(20),
  sku: z.string().min(1).max(80),
  barcode: z.string().max(80).optional(),
  salePrice: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v) : undefined))
    .pipe(z.number().min(0).optional()),
  minStock: z
    .string()
    .default("0")
    .transform(Number)
    .pipe(z.number().int().min(0)),
  quantity: z
    .string()
    .default("0")
    .transform(Number)
    .pipe(z.number().int().min(0)),
});

export type ProductInput = z.infer<typeof productSchema>;
export type CreateProductFullInput = z.infer<typeof createProductFullSchema>;
export type VariantInput = z.infer<typeof variantSchema>;

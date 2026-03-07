import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email obrigatório" })
    .email("Email inválido"),
  senha: z
    .string({ required_error: "Senha obrigatória" })
    .min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const registroSchema = z
  .object({
    nomeLoja: z
      .string({ required_error: "Nome da loja obrigatório" })
      .min(2, "Nome da loja deve ter pelo menos 2 caracteres")
      .max(150, "Nome da loja muito longo"),
    nome: z
      .string({ required_error: "Seu nome é obrigatório" })
      .min(2, "Nome deve ter pelo menos 2 caracteres")
      .max(150, "Nome muito longo"),
    email: z
      .string({ required_error: "Email obrigatório" })
      .email("Email inválido"),
    senha: z
      .string({ required_error: "Senha obrigatória" })
      .min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirmarSenha: z.string({ required_error: "Confirmação obrigatória" }),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistroInput = z.infer<typeof registroSchema>;

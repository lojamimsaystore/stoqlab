/**
 * Rate limiting via Upstash Redis.
 * Se UPSTASH_REDIS_REST_URL não estiver configurado, todas as requisições
 * são permitidas (degradação graciosa — não quebra o app em desenvolvimento).
 */
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

function createLimiter(requests: number, window: `${number} ${"s" | "m" | "h" | "d"}`) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
    prefix: "stoqlab:rl",
  });
}

// Login: 5 tentativas por 10 minutos por IP
const loginLimiter = createLimiter(5, "10 m");

// Registro: 5 contas por hora por IP
const registerLimiter = createLimiter(5, "1 h");

// Actions críticas: 60 operações por minuto por usuário
const actionLimiter = createLimiter(60, "1 m");

export type RateLimitResult =
  | { success: true }
  | { success: false; retryAfter: number };

async function check(
  limiter: ReturnType<typeof createLimiter>,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) return { success: true }; // Upstash não configurado → permite tudo

  const { success, reset } = await limiter.limit(key);
  if (success) return { success: true };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return { success: false, retryAfter };
}

export async function checkLoginLimit(ip: string): Promise<RateLimitResult> {
  return check(loginLimiter, `login:${ip}`);
}

export async function checkRegisterLimit(ip: string): Promise<RateLimitResult> {
  return check(registerLimiter, `register:${ip}`);
}

/**
 * Rate limit para Server Actions críticas (criar venda, compra, ajustar estoque).
 * Limita por userId para evitar abuso de usuários autenticados.
 * @param userId  ID do usuário autenticado
 * @param action  Nome da action (ex: "create_sale")
 */
export async function checkActionLimit(
  userId: string,
  action: string,
): Promise<RateLimitResult> {
  return check(actionLimiter, `action:${action}:${userId}`);
}

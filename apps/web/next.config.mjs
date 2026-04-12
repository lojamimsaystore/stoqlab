/** @type {import('next').NextConfig} */

const securityHeaders = [
  // Impede clickjacking — a página não pode ser embutida em iframes de outros domínios
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Impede MIME sniffing — o browser respeita o Content-Type declarado
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Não envia o Referer completo para domínios externos
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Habilita DNS prefetch para performance
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // Força HTTPS por 1 ano (ativar apenas após confirmar que o domínio usa HTTPS)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Desabilita acesso a funcionalidades do browser que não usamos
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig = {
  transpilePackages: ["@stoqlab/ui", "@stoqlab/utils", "@stoqlab/validators"],

  async headers() {
    return [
      {
        // Aplica os headers de segurança em todas as rotas
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

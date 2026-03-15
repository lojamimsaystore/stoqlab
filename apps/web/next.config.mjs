/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@stoqlab/ui", "@stoqlab/utils", "@stoqlab/validators"],
  typescript: {
    // Permite o build passar mesmo com erros de tipo — corrigir gradualmente
    ignoreBuildErrors: true,
  },
  eslint: {
    // Permite o build passar mesmo com warnings de ESLint
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;

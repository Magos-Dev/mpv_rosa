import type { NextConfig } from "next";

// Cabeçalhos de segurança aplicados a todas as respostas
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    // No Cloudflare Workers o otimizador do Next exige o serviço pago
    // Cloudflare Images. As fotos já são reduzidas no navegador antes do
    // envio (ImageUpload) e servidas direto do Supabase Storage.
    unoptimized: true,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Service worker (notificações): sempre revalidar para receber atualizações
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] },
    ];
  },
};

export default nextConfig;

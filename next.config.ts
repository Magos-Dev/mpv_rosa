import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://rjqjichlkboharrmdyux.supabase.co";
const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");
const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy: o navegador só carrega scripts/estilos do próprio
// site e só se conecta ao Supabase (API, Realtime) e ao ViaCEP.
// 'unsafe-inline' em scripts é exigido pelos scripts de hidratação do Next
// (sem nonce); 'unsafe-eval' apenas em desenvolvimento.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabaseUrl}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseUrl} ${supabaseWs} https://viacep.com.br${isDev ? " ws:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

// Cabeçalhos de segurança aplicados a todas as respostas
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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

import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

// Endereços antigos: redirecionam (301) para o atual, mantendo caminho e
// parâmetros — links e QR Codes já divulgados continuam funcionando.
const LEGACY_HOSTS = new Set(["pedidos.rosaerose.afweb.com.br"]);

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.toLowerCase();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (host && siteUrl && LEGACY_HOSTS.has(host)) {
    const target = new URL(request.nextUrl.pathname + request.nextUrl.search, siteUrl);
    return NextResponse.redirect(target, 301);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e imagens
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

/**
 * Recebe os links enviados pelo Supabase Auth (convite, redefinição de senha)
 * e troca o código por uma sessão.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/admin");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/admin/login?erro=link-invalido", request.url));
}

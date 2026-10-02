import { NextResponse, type NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { homePathForRole, safeRedirectPath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

// POST: botão "Sair".
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirectTo(request, safeRedirectPath(request.nextUrl.searchParams.get("next"), "/admin/login"));
}

// GET: usado pelo servidor (requireRole) para encerrar a sessão de usuários
// DESATIVADOS. Para usuários ativos não desloga — um link externo para esta
// rota não consegue derrubar a sessão de ninguém.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.active) return redirectTo(request, homePathForRole(profile.role));

  if (profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return redirectTo(request, safeRedirectPath(request.nextUrl.searchParams.get("next"), "/admin/login"));
}

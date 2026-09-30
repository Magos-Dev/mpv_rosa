import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"), "/admin/login");
  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}

// POST: botão "Sair". GET: usado pelo servidor para encerrar sessões de usuários desativados.
export const POST = signOut;
export const GET = signOut;

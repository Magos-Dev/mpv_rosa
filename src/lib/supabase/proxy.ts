import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { LOGIN_PATHS } from "@/lib/auth/roles";
import type { Database } from "@/types/database";

const PROTECTED_AREAS = [
  { prefix: "/admin", loginPath: LOGIN_PATHS.staff },
  { prefix: "/entregador", loginPath: LOGIN_PATHS.courier },
] as const;

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Renova a sessão do Supabase (cookies) e redireciona visitantes sem sessão
 * das áreas protegidas para o login correspondente.
 * A verificação de PERFIL acontece no servidor (requireRole), não aqui.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Não inserir código entre createServerClient e getClaims:
  // é aqui que o token é validado/renovado.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const area = PROTECTED_AREAS.find((a) => matchesPrefix(pathname, a.prefix));

  if (area && !isAuthenticated && !matchesPrefix(pathname, area.loginPath)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = area.loginPath;
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);

    const redirectResponse = NextResponse.redirect(loginUrl);
    // Preserva cookies eventualmente renovados/limpos
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return response;
}

import { NextResponse } from "next/server";

import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Exporta SOMENTE clientes com consentimento de marketing ativo (LGPD),
// para campanhas futuras. Não dispara nada. Acesso: Admin.

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  // Evita injeção de fórmulas ao abrir no Excel/Sheets
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const profile = await getCurrentProfile();
  if (!profile?.active || profile.role !== "admin") {
    return new NextResponse("Acesso negado.", { status: 403 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("name, phone, email, marketing_opt_in_at, total_orders, last_order_at")
    .eq("marketing_opt_in", true)
    .order("name");

  if (error) {
    console.error("[customers] exportar:", error.message);
    return new NextResponse("Não foi possível exportar.", { status: 500 });
  }

  const header = ["Nome", "WhatsApp", "E-mail", "Consentimento em", "Pedidos concluídos", "Último pedido concluído"];
  const rows = data.map((c) =>
    [c.name, `+55${c.phone}`, c.email, c.marketing_opt_in_at, c.total_orders, c.last_order_at].map(csvCell).join(";"),
  );
  // BOM para o Excel reconhecer UTF-8; ";" é o separador padrão no Excel em português
  const body = "﻿" + [header.map(csvCell).join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-com-consentimento-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

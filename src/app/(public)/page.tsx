import { redirect } from "next/navigation";

import { firstParam } from "@/lib/auth/messages";

// A entrada do site é o cardápio. Preserva a origem (?src=mesa01) dos QR Codes.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const src = firstParam((await searchParams).src);
  redirect(src && /^[a-z0-9_-]{1,40}$/i.test(src) ? `/cardapio?src=${src}` : "/cardapio");
}

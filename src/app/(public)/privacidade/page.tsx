import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de Privacidade" };

// Estrutura da página. O texto jurídico definitivo (LGPD — seção 32 do
// briefing) deve ser fornecido/revisado pelo estabelecimento.
export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Política de Privacidade
      </h1>
      <p className="text-muted-foreground">
        O texto da Política de Privacidade está em elaboração e será publicado antes do início
        dos pedidos online.
      </p>
    </article>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-5xl font-semibold text-primary">404</p>
      <h1 className="text-lg font-medium">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        O endereço acessado não existe ou foi removido.
      </p>
      <Button asChild size="lg">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  );
}

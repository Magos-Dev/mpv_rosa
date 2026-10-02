import Link from "next/link";
import { Suspense } from "react";

import { Brand } from "@/components/layout/brand";
import { CartBar, CartButton, SourceCapture } from "@/components/menu/cart-widgets";
import { getStoreName } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getStoreName();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/cardapio" aria-label="Cardápio">
            <Brand name={storeName} />
          </Link>
          <CartButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      {/* pb extra: espaço para as barras fixas do carrinho */}
      <footer className="border-t pb-20">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {storeName}
          </span>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>
          <span className="w-full text-center text-xs">
            Desenvolvido por{" "}
            <a
              href="https://afweb.com.br"
              target="_blank"
              rel="noopener"
              className="font-medium underline-offset-4 hover:text-foreground hover:underline"
            >
              AFWEB
            </a>
          </span>
        </div>
      </footer>
      <CartBar />
      <Suspense>
        <SourceCapture />
      </Suspense>
    </div>
  );
}

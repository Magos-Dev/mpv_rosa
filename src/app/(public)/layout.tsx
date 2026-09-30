import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { getStoreName } from "@/lib/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const storeName = await getStoreName();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4">
          <Link href="/" aria-label="Página inicial">
            <Brand name={storeName} />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} {storeName}
          </span>
          <Link href="/privacidade" className="underline-offset-4 hover:underline">
            Política de Privacidade
          </Link>
        </div>
      </footer>
    </div>
  );
}

import { UtensilsCrossed } from "lucide-react";

import { getStoreSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await getStoreSettings();

  return (
    <section className="flex flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <UtensilsCrossed className="size-7" aria-hidden />
      </span>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        {settings?.store_name ?? "Cardápio Digital"}
      </h1>
      <p className="max-w-sm text-muted-foreground">
        Nosso cardápio online está sendo preparado. Em breve você poderá fazer seu pedido por aqui.
      </p>
    </section>
  );
}

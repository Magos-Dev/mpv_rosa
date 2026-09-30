import { Clock, UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/feedback/empty-state";
import { MenuView } from "@/components/menu/menu-view";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getPublicMenu } from "@/lib/catalog/queries";
import { DEFAULT_STORE_NAME, getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  return { title: `Cardápio — ${settings?.store_name ?? DEFAULT_STORE_NAME}` };
}

export default async function MenuPage() {
  const [categories, settings] = await Promise.all([getPublicMenu(), getStoreSettings()]);
  const open = settings?.accepting_orders ?? false;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {settings?.store_name ?? DEFAULT_STORE_NAME}
        </h1>
        <Badge variant={open ? "default" : "secondary"}>{open ? "Aberto" : "Fechado"}</Badge>
      </div>

      {!open && (
        <Alert>
          <Clock aria-hidden />
          <AlertDescription>
            Estamos fechados no momento. Você pode ver o cardápio, mas os pedidos só serão aceitos
            quando abrirmos.
          </AlertDescription>
        </Alert>
      )}

      {categories.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Cardápio em preparação"
          description="Ainda não há itens disponíveis. Volte em breve!"
        />
      ) : (
        <MenuView categories={categories} />
      )}
    </div>
  );
}

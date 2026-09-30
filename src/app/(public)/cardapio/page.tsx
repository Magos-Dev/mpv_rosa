import { UtensilsCrossed } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/feedback/empty-state";
import { MenuView } from "@/components/menu/menu-view";
import { getPublicMenu } from "@/lib/catalog/queries";
import { getStoreName } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Cardápio — ${await getStoreName()}` };
}

export default async function MenuPage() {
  const [categories, storeName] = await Promise.all([getPublicMenu(), getStoreName()]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{storeName}</h1>
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

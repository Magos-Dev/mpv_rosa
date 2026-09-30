import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { listActiveZones } from "@/lib/delivery-zones/queries";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Carrinho" };

export default async function CartPage() {
  const [settings, zones] = await Promise.all([getStoreSettings(), listActiveZones()]);
  const fees = zones.map((z) => z.fee);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Seu carrinho</h1>
      <CartView
        accepting={settings?.accepting_orders ?? false}
        deliveryFee={settings?.default_delivery_fee ?? 0}
        zoneFees={fees.length ? { min: Math.min(...fees), max: Math.max(...fees) } : null}
        minimumOrder={settings?.minimum_order ?? 0}
      />
    </div>
  );
}

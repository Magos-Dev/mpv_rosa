import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Finalizar pedido", robots: { index: false } };

export default async function CheckoutPage() {
  const settings = await getStoreSettings();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Finalizar pedido</h1>
      <CheckoutForm accepting={settings?.accepting_orders ?? false} />
    </div>
  );
}

import type { Metadata } from "next";

import { ZoneManager } from "@/components/delivery-zones/zone-manager";
import { listAllZones } from "@/lib/delivery-zones/queries";
import { getStoreSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Taxas de entrega" };

export default async function DeliveryZonesPage() {
  const [zones, settings] = await Promise.all([listAllZones(), getStoreSettings()]);
  return <ZoneManager zones={zones} defaultFee={settings?.default_delivery_fee ?? 0} />;
}

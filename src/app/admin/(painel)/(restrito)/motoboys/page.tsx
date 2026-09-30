import type { Metadata } from "next";

import { CourierManager } from "@/components/couriers/courier-manager";
import { listCouriers } from "@/lib/couriers/queries";

export const metadata: Metadata = { title: "Motoboys" };

export default async function CouriersPage() {
  const couriers = await listCouriers();
  return <CourierManager couriers={couriers} />;
}

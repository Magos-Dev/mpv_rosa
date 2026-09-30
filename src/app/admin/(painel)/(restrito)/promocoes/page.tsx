import type { Metadata } from "next";

import { PromotionManager } from "@/components/marketing/promotion-manager";
import { listPromotions, listTargets } from "@/lib/marketing/queries";

export const metadata: Metadata = { title: "Promoções" };

export default async function PromotionsPage() {
  const [promotions, targets] = await Promise.all([listPromotions(), listTargets()]);
  return <PromotionManager promotions={promotions} targets={targets} />;
}

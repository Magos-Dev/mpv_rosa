import type { Metadata } from "next";

import { LoyaltyManager } from "@/components/marketing/loyalty-manager";
import { listLoyaltyRules, listTargets } from "@/lib/marketing/queries";

export const metadata: Metadata = { title: "Fidelidade" };

export default async function LoyaltyPage() {
  const [rules, { products }] = await Promise.all([listLoyaltyRules(), listTargets()]);
  return <LoyaltyManager rules={rules} products={products} />;
}

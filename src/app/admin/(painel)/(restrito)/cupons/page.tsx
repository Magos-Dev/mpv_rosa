import type { Metadata } from "next";

import { CouponManager } from "@/components/marketing/coupon-manager";
import { listCoupons } from "@/lib/marketing/queries";

export const metadata: Metadata = { title: "Cupons" };

export default async function CouponsPage() {
  const coupons = await listCoupons();
  return <CouponManager coupons={coupons} />;
}

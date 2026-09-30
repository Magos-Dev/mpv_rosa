import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { OrderBoard } from "@/components/orders/order-board";
import { listBoardOrders } from "@/lib/orders/admin-queries";

export const metadata: Metadata = { title: "Pedidos" };

export default async function OrdersBoardPage() {
  const orders = await listBoardOrders();

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Novos pedidos aparecem aqui automaticamente. Toque no botão do cartão para avançar o status."
      />
      <OrderBoard orders={orders} />
    </div>
  );
}

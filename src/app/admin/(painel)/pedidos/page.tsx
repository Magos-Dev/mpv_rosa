import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { OrderBoard } from "@/components/orders/order-board";
import { listBoardOrders } from "@/lib/orders/admin-queries";
import { getMessageContext } from "@/lib/whatsapp/context";

export const metadata: Metadata = { title: "Pedidos" };

export default async function OrdersBoardPage() {
  const [orders, messages] = await Promise.all([listBoardOrders(), getMessageContext()]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Pedidos"
        description="Novos pedidos aparecem aqui automaticamente. Toque no botão do cartão para avançar o status."
      />
      <OrderBoard orders={orders} messages={messages} />
    </div>
  );
}

import { AlertCircle, UserX } from "lucide-react";
import type { Metadata } from "next";

import { CourierHome } from "@/components/courier/courier-home";
import { EmptyState } from "@/components/feedback/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { messageFromQuery } from "@/lib/auth/messages";
import { getCourierHome } from "@/lib/couriers/queries";

export const metadata: Metadata = { title: "Início" };

export default async function CourierHomePage({ searchParams }: PageProps<"/entregador">) {
  const [params, data] = await Promise.all([searchParams, getCourierHome()]);
  const notice = messageFromQuery(params.erro);

  return (
    <div className="flex flex-col gap-4">
      {notice && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      {data ? (
        <CourierHome data={data} />
      ) : (
        <EmptyState
          icon={UserX}
          title="Cadastro de motoboy não encontrado"
          description="Seu acesso existe, mas ainda não foi vinculado a um cadastro de motoboy ativo. Fale com a loja."
        />
      )}
    </div>
  );
}

import { AlertCircle, Bike } from "lucide-react";
import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { messageFromQuery } from "@/lib/auth/messages";
import { getCurrentProfile } from "@/lib/auth/session";
import { firstName } from "@/lib/format";

export const metadata: Metadata = { title: "Início" };

export default async function CourierHomePage({ searchParams }: PageProps<"/entregador">) {
  const [params, profile] = await Promise.all([searchParams, getCurrentProfile()]);
  const notice = messageFromQuery(params.erro);

  if (!profile) return null;

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}

      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Olá, {firstName(profile.name)}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bike className="size-5 text-muted-foreground" aria-hidden />
            Entregas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Seu status e as entregas disponíveis aparecerão aqui quando o módulo de entregas
            estiver ativo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

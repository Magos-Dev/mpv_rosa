import type { ReactNode } from "react";

import { Brand } from "@/components/layout/brand";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type LoginShellProps = {
  storeName: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function LoginShell({ storeName, title, description, children }: LoginShellProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Brand name={storeName} className="justify-center" />
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}

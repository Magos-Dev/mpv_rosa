import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { WhatsAppTemplatesForm } from "@/components/settings/whatsapp-templates-form";
import { getStoreSettings } from "@/lib/settings";
import { resolveTemplates } from "@/lib/whatsapp/templates";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const settings = await getStoreSettings();
  if (!settings) throw new Error("Configurações da loja não encontradas.");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="Configurações" description="Dados do estabelecimento e regras de pedido." />
      <SettingsForm settings={settings} />
      <WhatsAppTemplatesForm initial={resolveTemplates(settings.whatsapp_templates)} />
    </div>
  );
}

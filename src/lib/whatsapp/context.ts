import "server-only";

import { getStoreSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/site-url";
import { resolveTemplates, type Templates } from "@/lib/whatsapp/templates";

/** Dados da loja usados para montar as mensagens de WhatsApp. */
export type MessageContext = {
  templates: Templates;
  storeName: string;
  storeAddress: string;
  siteUrl: string;
};

export async function getMessageContext(): Promise<MessageContext> {
  const [settings, siteUrl] = await Promise.all([getStoreSettings(), getSiteUrl()]);
  return {
    templates: resolveTemplates(settings?.whatsapp_templates),
    storeName: settings?.store_name ?? "",
    storeAddress: settings?.address ?? "",
    siteUrl,
  };
}

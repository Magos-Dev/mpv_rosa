import { firstName, formatBRL } from "@/lib/format";
import type { OrderStatus, OrderType } from "@/lib/orders/labels";

// Mensagens prontas de WhatsApp (Etapa 7B). O atendente abre o WhatsApp
// com o texto preenchido e envia. Quando houver um provedor contratado,
// as mesmas chaves/textos serão enviadas automaticamente.

export const TEMPLATE_KEYS = [
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "reward",
  "promotion",
] as const;

export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export type Templates = Record<TemplateKey, string>;

export const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  confirmed: "Pedido confirmado",
  ready_for_pickup: "Pronto para retirada",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue / obrigado",
  cancelled: "Pedido cancelado",
  reward: "Brinde de fidelidade",
  promotion: "Promoção (só com consentimento)",
};

export const DEFAULT_TEMPLATES: Templates = {
  confirmed:
    "Olá, {nome}! Seu pedido #{pedido} na {loja} foi confirmado e já está sendo preparado 🍔\nTotal: {total}\nAcompanhe aqui: {link}",
  ready_for_pickup:
    "{nome}, seu pedido #{pedido} está pronto para retirada! 🛍️\n{endereco_loja}",
  out_for_delivery:
    "{nome}, seu pedido #{pedido} saiu para entrega com {motoboy} 🛵\nAcompanhe aqui: {link}",
  delivered: "Pedido #{pedido} entregue! Muito obrigado pela preferência, {nome} 💖",
  cancelled:
    "{nome}, infelizmente seu pedido #{pedido} foi cancelado.\nMotivo: {motivo}\nQualquer dúvida, é só responder esta mensagem.",
  reward: "{nome}, você completou mais uma etapa da fidelidade e ganhou: {brinde} 🎁 Obrigado!",
  promotion:
    "Olá, {nome}! Temos novidades na {loja} 😋\nConfira o cardápio: {cardapio}\n\nPara não receber mais promoções, responda SAIR.",
};

/** Campos que podem ser usados nos textos (exibidos na tela de edição). */
export const TEMPLATE_FIELDS: { key: string; description: string }[] = [
  { key: "{nome}", description: "primeiro nome do cliente" },
  { key: "{pedido}", description: "número do pedido" },
  { key: "{total}", description: "total do pedido" },
  { key: "{link}", description: "link de acompanhamento" },
  { key: "{motoboy}", description: "nome do motoboy (ou “nosso entregador”)" },
  { key: "{motivo}", description: "motivo do cancelamento" },
  { key: "{brinde}", description: "brinde de fidelidade" },
  { key: "{loja}", description: "nome da loja" },
  { key: "{endereco_loja}", description: "endereço da loja" },
  { key: "{cardapio}", description: "link do cardápio" },
];

/** Textos efetivos: personalizados pelo Admin ou o padrão. */
export function resolveTemplates(custom: unknown): Templates {
  const saved = (custom && typeof custom === "object" ? custom : {}) as Record<string, unknown>;
  const result = { ...DEFAULT_TEMPLATES };
  for (const key of TEMPLATE_KEYS) {
    const value = saved[key];
    if (typeof value === "string" && value.trim()) result[key] = value;
  }
  return result;
}

export type TemplateVars = Partial<Record<
  "nome" | "pedido" | "total" | "link" | "motoboy" | "motivo" | "brinde" | "loja" | "endereco_loja" | "cardapio",
  string
>>;

/** Dados da loja necessários para as mensagens (serializável: vai para o cliente). */
export type MessageStore = { storeName: string; storeAddress: string; siteUrl: string };

/** Variáveis de um pedido para os textos. */
export function orderVars(
  order: {
    customer_name: string;
    order_number: number;
    total: number;
    public_token: string;
    courier_name?: string | null;
    cancellation_reason?: string | null;
    reward_description?: string | null;
  },
  store: MessageStore,
): TemplateVars {
  return {
    nome: firstName(order.customer_name),
    pedido: String(order.order_number),
    total: formatBRL(order.total).replace(/ /g, " "),
    link: `${store.siteUrl}/pedido/${order.public_token}`,
    motoboy: order.courier_name || "nosso entregador",
    motivo: order.cancellation_reason || "não informado",
    brinde: order.reward_description || "",
    loja: store.storeName,
    endereco_loja: store.storeAddress,
    cardapio: `${store.siteUrl}/cardapio`,
  };
}

/** Substitui {campo}; campos sem valor viram vazio. */
export function renderTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{(\w+)\}/g, (_, name: string) => vars[name as keyof TemplateVars] ?? "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Link que abre o WhatsApp (app ou web) com o número e o texto prontos. */
export function whatsappLink(phoneDigits: string, text: string): string {
  const digits = phoneDigits.replace(/\D/g, "");
  const full = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Mensagem sugerida para o status atual do pedido (botão rápido do Kanban). */
export function suggestedTemplate(status: OrderStatus): TemplateKey | null {
  switch (status) {
    case "confirmed":
    case "preparing":
      return "confirmed";
    case "ready_for_pickup":
      return "ready_for_pickup";
    case "out_for_delivery":
      return "out_for_delivery";
    case "delivered":
    case "picked_up":
      return "delivered";
    case "cancelled":
    case "refused":
      return "cancelled";
    default:
      return null;
  }
}

/** Mensagens disponíveis no detalhe do pedido. */
export function templatesForOrder(type: OrderType, status: OrderStatus, hasReward: boolean): TemplateKey[] {
  const keys: TemplateKey[] = [];
  if (status === "cancelled" || status === "refused") return ["cancelled"];
  keys.push("confirmed");
  if (type === "pickup") keys.push("ready_for_pickup");
  if (type === "delivery") keys.push("out_for_delivery");
  if (status === "delivered" || status === "picked_up") keys.push("delivered");
  if (hasReward) keys.push("reward");
  return keys;
}

import type { OrderStatus, OrderType, PaymentMethod } from "@/lib/orders/labels";

/** Item como enviado ao servidor: só identificadores e escolhas, nunca preços. */
export type CartItemPayload = {
  product_id: string;
  quantity: number;
  notes: string | null;
  option_ids: string[];
};

export type QuotedItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
  options: { option_id: string; group_name: string; name: string; additional_price: number }[];
};

/** Resposta da função quote_order (valores oficiais do servidor). */
export type Quote = {
  items: QuotedItem[];
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  minimum_order: number;
  accepting_orders: boolean;
  /** Cupom aplicado (válido) ou null. */
  coupon: { code: string; type: "percent" | "fixed" | "free_delivery"; description: string | null } | null;
  /** Motivo da recusa do cupom informado, se houver. */
  coupon_error: string | null;
};

export type AddressSnapshot = {
  zip_code: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string | null;
  reference: string | null;
};

/** Resposta da função get_order_by_token. */
export type PublicOrder = {
  order_number: number;
  status: OrderStatus;
  order_type: OrderType;
  customer_name: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  change_for: number | null;
  coupon_code: string | null;
  address: AddressSnapshot | null;
  notes: string | null;
  created_at: string;
  items: {
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
    notes: string | null;
    options: { group_name: string; name: string; additional_price: number }[];
  }[];
  history: { status: OrderStatus; at: string }[];
};

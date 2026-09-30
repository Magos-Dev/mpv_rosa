// Tipos do banco no formato gerado pelo Supabase CLI.
// Regenerar com: npm run db:types  (sobrescreve este arquivo)

/** Formato compacto de tabela (Insert: obrigatórios + opcionais; Update: tudo opcional). */
type TableDef<Row, Required extends keyof Row, Rel extends unknown[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Rel;
};

/** Relacionamento N:1 no formato gerado pelo Supabase. */
type FK<Name extends string, Column extends string, Target extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Target;
  referencedColumns: ["id"];
};

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      option_groups: {
        Row: {
          created_at: string;
          id: string;
          max_choices: number;
          min_choices: number;
          name: string;
          product_id: string;
          required: boolean;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          max_choices?: number;
          min_choices?: number;
          name: string;
          product_id: string;
          required?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          max_choices?: number;
          min_choices?: number;
          name?: string;
          product_id?: string;
          required?: boolean;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "option_groups_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_options: {
        Row: {
          additional_price: number;
          available: boolean;
          created_at: string;
          id: string;
          name: string;
          option_group_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          additional_price?: number;
          available?: boolean;
          created_at?: string;
          id?: string;
          name: string;
          option_group_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          additional_price?: number;
          available?: boolean;
          created_at?: string;
          id?: string;
          name?: string;
          option_group_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_options_option_group_id_fkey";
            columns: ["option_group_id"];
            isOneToOne: false;
            referencedRelation: "option_groups";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          active: boolean;
          available: boolean;
          best_seller: boolean;
          category_id: string;
          created_at: string;
          description: string | null;
          featured: boolean;
          id: string;
          image_url: string | null;
          name: string;
          price: number;
          promotional_price: number | null;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          available?: boolean;
          best_seller?: boolean;
          category_id: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          name: string;
          price: number;
          promotional_price?: number | null;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          available?: boolean;
          best_seller?: boolean;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          id?: string;
          image_url?: string | null;
          name?: string;
          price?: number;
          promotional_price?: number | null;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          name: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          id: string;
          name?: string;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          name?: string;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      settings: {
        Row: {
          accepting_orders: boolean;
          address: string | null;
          created_at: string;
          default_delivery_fee: number;
          id: string;
          logo_url: string | null;
          minimum_order: number;
          opening_hours: Json;
          phone: string | null;
          store_name: string;
          updated_at: string;
          whatsapp: string | null;
          whatsapp_templates: Json;
        };
        Insert: {
          accepting_orders?: boolean;
          address?: string | null;
          created_at?: string;
          default_delivery_fee?: number;
          id?: string;
          logo_url?: string | null;
          minimum_order?: number;
          opening_hours?: Json;
          phone?: string | null;
          store_name: string;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_templates?: Json;
        };
        Update: {
          accepting_orders?: boolean;
          address?: string | null;
          created_at?: string;
          default_delivery_fee?: number;
          id?: string;
          logo_url?: string | null;
          minimum_order?: number;
          opening_hours?: Json;
          phone?: string | null;
          store_name?: string;
          updated_at?: string;
          whatsapp?: string | null;
          whatsapp_templates?: Json;
        };
        Relationships: [];
      };
      push_subscriptions: TableDef<
        {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          last_used_at: string | null;
        },
        "user_id" | "endpoint" | "p256dh" | "auth"
      >;
      message_logs: TableDef<
        {
          id: string;
          order_id: string | null;
          customer_id: string | null;
          template: string;
          channel: string;
          sent_by: string | null;
          sent_by_name: string | null;
          created_at: string;
        },
        "template",
        [
          FK<"message_logs_order_id_fkey", "order_id", "orders">,
          FK<"message_logs_customer_id_fkey", "customer_id", "customers">,
        ]
      >;
      couriers: TableDef<
        {
          id: string;
          user_id: string;
          name: string;
          phone: string | null;
          vehicle_type: string | null;
          plate: string | null;
          status: Database["public"]["Enums"]["courier_status"];
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        "user_id" | "name",
        [FK<"couriers_user_id_fkey", "user_id", "profiles">]
      >;
      deliveries: TableDef<
        {
          id: string;
          order_id: string;
          courier_id: string | null;
          status: Database["public"]["Enums"]["delivery_status"];
          offered_at: string;
          accepted_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
        },
        "order_id",
        [
          FK<"deliveries_order_id_fkey", "order_id", "orders">,
          FK<"deliveries_courier_id_fkey", "courier_id", "couriers">,
        ]
      >;
      delivery_zones: TableDef<
        {
          id: string;
          neighborhood: string;
          city: string;
          fee: number;
          estimated_time: string | null;
          active: boolean;
          neighborhood_key: string;
          city_key: string;
          created_at: string;
          updated_at: string;
        },
        "neighborhood" | "city" | "fee"
      >;
      loyalty_rules: TableDef<
        {
          id: string;
          name: string;
          orders_required: number;
          reward_type: "product" | "other";
          reward_product_id: string | null;
          reward_description: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        "name" | "orders_required" | "reward_description"
      >;
      loyalty_rewards: TableDef<
        {
          id: string;
          customer_id: string;
          loyalty_rule_id: string;
          order_id: string | null;
          status: Database["public"]["Enums"]["loyalty_reward_status"];
          reward_description: string;
          created_at: string;
          redeemed_at: string | null;
          redeemed_by_name: string | null;
        },
        "customer_id" | "loyalty_rule_id" | "reward_description",
        [
          FK<"loyalty_rewards_order_id_fkey", "order_id", "orders">,
          FK<"loyalty_rewards_customer_id_fkey", "customer_id", "customers">,
        ]
      >;
      promotions: TableDef<
        {
          id: string;
          name: string;
          type: Database["public"]["Enums"]["promotion_type"];
          value: number;
          product_id: string | null;
          category_id: string | null;
          starts_at: string;
          ends_at: string;
          daily_start: string | null;
          daily_end: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        "name" | "type" | "value" | "starts_at" | "ends_at",
        [
          FK<"promotions_product_id_fkey", "product_id", "products">,
          FK<"promotions_category_id_fkey", "category_id", "categories">,
        ]
      >;
      coupons: TableDef<
        {
          id: string;
          code: string;
          description: string | null;
          type: Database["public"]["Enums"]["coupon_type"];
          value: number;
          minimum_order: number;
          usage_limit: number | null;
          usage_per_customer: number | null;
          starts_at: string;
          expires_at: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        },
        "code" | "type"
      >;
      customers: TableDef<
        {
          id: string;
          name: string;
          phone: string;
          email: string | null;
          marketing_opt_in: boolean;
          marketing_opt_in_at: string | null;
          marketing_opt_out_at: string | null;
          total_orders: number;
          total_spent: number;
          first_order_at: string | null;
          last_order_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        },
        "name" | "phone"
      >;
      customer_addresses: TableDef<
        {
          id: string;
          customer_id: string;
          zip_code: string | null;
          street: string;
          number: string;
          complement: string | null;
          neighborhood: string;
          city: string;
          state: string | null;
          reference: string | null;
          is_default: boolean;
          created_at: string;
        },
        "customer_id" | "street" | "number" | "neighborhood" | "city"
      >;
      orders: TableDef<
        {
          id: string;
          order_number: number;
          public_token: string;
          customer_id: string;
          customer_snapshot: Json;
          order_type: Database["public"]["Enums"]["order_type"];
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          discount: number;
          delivery_fee: number;
          total: number;
          payment_method: Database["public"]["Enums"]["payment_method"];
          change_for: number | null;
          coupon_id: string | null;
          address_snapshot: Json | null;
          customer_notes: string | null;
          source: string | null;
          created_at: string;
          updated_at: string;
          confirmed_at: string | null;
          ready_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
        },
        "customer_id" | "customer_snapshot" | "order_type" | "subtotal" | "total" | "payment_method",
        [
          FK<"orders_coupon_id_fkey", "coupon_id", "coupons">,
          FK<"orders_customer_id_fkey", "customer_id", "customers">,
        ]
      >;
      order_items: TableDef<
        {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number;
          total: number;
          notes: string | null;
          sort_order: number;
        },
        "order_id" | "product_name_snapshot" | "quantity" | "unit_price" | "total",
        [FK<"order_items_order_id_fkey", "order_id", "orders">]
      >;
      order_item_options: TableDef<
        {
          id: string;
          order_item_id: string;
          option_id: string | null;
          group_name_snapshot: string;
          option_name_snapshot: string;
          additional_price: number;
          quantity: number;
        },
        "order_item_id" | "group_name_snapshot" | "option_name_snapshot" | "additional_price",
        [FK<"order_item_options_order_item_id_fkey", "order_item_id", "order_items">]
      >;
      order_status_history: TableDef<
        {
          id: string;
          order_id: string;
          previous_status: Database["public"]["Enums"]["order_status"] | null;
          new_status: Database["public"]["Enums"]["order_status"];
          changed_by: string | null;
          changed_by_name: string | null;
          reason: string | null;
          created_at: string;
        },
        "order_id" | "new_status",
        [FK<"order_status_history_order_id_fkey", "order_id", "orders">]
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_delivery: { Args: { p_delivery_id: string }; Returns: undefined };
      cancel_dispatch: { Args: { p_order_id: string }; Returns: undefined };
      complete_delivery: { Args: { p_delivery_id: string }; Returns: undefined };
      current_courier_id: { Args: never; Returns: string };
      dispatch_delivery: { Args: { p_order_id: string }; Returns: Json };
      get_courier_history: { Args: never; Returns: Json };
      get_courier_home: { Args: never; Returns: Json };
      pickup_delivery: { Args: { p_delivery_id: string }; Returns: undefined };
      set_courier_status: {
        Args: { p_status: Database["public"]["Enums"]["courier_status"] };
        Returns: undefined;
      };
      change_order_status: {
        Args: {
          p_order_id: string;
          p_new_status: Database["public"]["Enums"]["order_status"];
          p_expected_status?: Database["public"]["Enums"]["order_status"];
          p_reason?: string;
        };
        Returns: Json;
      };
      create_order: { Args: { p_payload: Json }; Returns: Json };
      get_dashboard_stats: { Args: never; Returns: Json };
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      get_order_by_token: { Args: { p_token: string }; Returns: Json };
      is_admin: { Args: never; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      quote_order: {
        Args: {
          p_items: Json;
          p_order_type: Database["public"]["Enums"]["order_type"];
          p_coupon_code?: string;
          p_address?: Json;
        };
        Returns: Json;
      };
      get_promotion_prices: { Args: never; Returns: Json };
      save_push_subscription: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string; p_user_agent?: string };
        Returns: undefined;
      };
      log_message: {
        Args: { p_order_id: string | null; p_customer_id: string | null; p_template: string };
        Returns: undefined;
      };
      get_source_stats: { Args: never; Returns: Json };
      product_effective_price: { Args: { p_product_id: string }; Returns: number };
      redeem_loyalty_reward: { Args: { p_reward_id: string }; Returns: undefined };
      revoke_marketing_consent: { Args: { p_customer_id: string }; Returns: undefined };
      set_customer_notes: { Args: { p_customer_id: string; p_notes: string }; Returns: undefined };
      save_product_option_groups: {
        Args: { p_groups: Json; p_product_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      coupon_type: "percent" | "fixed" | "free_delivery";
      loyalty_reward_status: "available" | "redeemed" | "expired";
      promotion_type: "percent" | "fixed" | "promotional_price";
      courier_status: "available" | "busy" | "offline";
      delivery_status: "offered" | "accepted" | "picked_up" | "delivered" | "cancelled";
      order_status:
        | "new"
        | "confirmed"
        | "preparing"
        | "ready"
        | "awaiting_courier"
        | "courier_assigned"
        | "out_for_delivery"
        | "delivered"
        | "ready_for_pickup"
        | "picked_up"
        | "cancelled"
        | "refused";
      order_type: "delivery" | "pickup";
      payment_method: "pix" | "cash" | "card_on_delivery";
      user_role: "admin" | "operator" | "courier";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];

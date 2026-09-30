// Tipos do banco no formato gerado pelo Supabase CLI.
// Regenerar com: npm run db:types  (sobrescreve este arquivo)

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
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      is_admin: { Args: never; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      save_product_option_groups: {
        Args: { p_groups: Json; p_product_id: string };
        Returns: undefined;
      };
    };
    Enums: {
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

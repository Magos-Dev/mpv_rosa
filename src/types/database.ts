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

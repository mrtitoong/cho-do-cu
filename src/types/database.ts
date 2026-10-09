export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          detail: Json
          id: number
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          detail?: Json
          id?: never
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          fields: Json
          icon: string
          id: number
          is_active: boolean
          name: string
          parent_id: number | null
          price_label: string | null
          requires_images: boolean | null
          slug: string
          sort_order: number
        }
        Insert: {
          color?: string | null
          fields?: Json
          icon: string
          id?: never
          is_active?: boolean
          name: string
          parent_id?: number | null
          price_label?: string | null
          requires_images?: boolean | null
          slug: string
          sort_order?: number
        }
        Update: {
          color?: string | null
          fields?: Json
          icon?: string
          id?: never
          is_active?: boolean
          name?: string
          parent_id?: number | null
          price_label?: string | null
          requires_images?: boolean | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          path: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          path: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          path?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address_text: string | null
          attributes: Json
          category_id: number
          created_at: string
          description: string
          district: string | null
          id: string
          location: unknown
          price: number | null
          price_unit: string
          province: string | null
          public_location: unknown
          removed_reason: string | null
          seller_id: string
          status: string
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          address_text?: string | null
          attributes?: Json
          category_id: number
          created_at?: string
          description: string
          district?: string | null
          id?: string
          location?: unknown
          price?: number | null
          price_unit?: string
          province?: string | null
          public_location?: unknown
          removed_reason?: string | null
          seller_id?: string
          status?: string
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          address_text?: string | null
          attributes?: Json
          category_id?: number
          created_at?: string
          description?: string
          district?: string | null
          id?: string
          location?: unknown
          price?: number | null
          price_unit?: string
          province?: string | null
          public_location?: unknown
          removed_reason?: string | null
          seller_id?: string
          status?: string
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_reveals: {
        Row: {
          created_at: string
          id: number
          listing_id: string | null
          seller_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          listing_id?: string | null
          seller_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: never
          listing_id?: string | null
          seller_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "phone_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          content: Json
          cover_path: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: Json
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: Json
          cover_path?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_reason: string | null
          created_at: string
          full_name: string | null
          id: string
          is_banned: boolean
          last_seen_at: string | null
          phone: string | null
          role: string
        }
        Insert: {
          avatar_url?: string | null
          banned_reason?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_banned?: boolean
          last_seen_at?: string | null
          phone?: string | null
          role?: string
        }
        Update: {
          avatar_url?: string | null
          banned_reason?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_banned?: boolean
          last_seen_at?: string | null
          phone?: string | null
          role?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          buyer_id: string | null
          category_id: number
          completed_at: string
          final_price: number | null
          id: string
          listing_id: string | null
          seller_id: string
        }
        Insert: {
          buyer_id?: string | null
          category_id: number
          completed_at?: string
          final_price?: number | null
          id?: string
          listing_id?: string | null
          seller_id: string
        }
        Update: {
          buyer_id?: string | null
          category_id?: number
          completed_at?: string
          final_price?: number | null
          id?: string
          listing_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_category: {
        Args: { p_id: number }
        Returns: undefined
      }
      admin_list_categories: {
        Args: never
        Returns: {
          active_listings: number
          color: string
          fields: Json
          icon: string
          id: number
          is_active: boolean
          name: string
          parent_id: number
          price_label: string
          requires_images: boolean
          slug: string
          sort_order: number
          total_listings: number
          used_keys: string[]
        }[]
      }
      admin_list_listings: {
        Args: {
          p_category_id?: number
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_seller?: string
          p_seller_id?: string
          p_status?: string
          p_to?: string
        }
        Returns: {
          category_id: number
          category_name: string
          cover_image_path: string
          created_at: string
          district: string
          id: string
          main_category_name: string
          price: number
          price_unit: string
          province: string
          removed_reason: string
          seller_email: string
          seller_id: string
          seller_is_banned: boolean
          seller_name: string
          status: string
          title: string
          total_count: number
        }[]
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role?: string
          p_search?: string
          p_status?: string
          p_user_id?: string
        }
        Returns: {
          active_listings: number
          avatar_url: string
          banned_reason: string
          created_at: string
          email: string
          full_name: string
          id: string
          is_banned: boolean
          last_seen_at: string
          phone: string
          role: string
          total_count: number
          transactions: number
        }[]
      }
      admin_reorder_categories: {
        Args: { p_ids: number[]; p_parent_id?: number }
        Returns: undefined
      }
      admin_save_category: {
        Args: { p_data: Json; p_id?: number }
        Returns: number
      }
      admin_set_category_active: {
        Args: { p_active: boolean; p_id: number }
        Returns: undefined
      }
      admin_set_listing_status: {
        Args: { p_action: string; p_listing_id: string; p_reason?: string }
        Returns: string
      }
      admin_set_user_ban: {
        Args: { p_banned: boolean; p_reason?: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_user_role: {
        Args: { p_role: string; p_user_id: string }
        Returns: undefined
      }
      get_admin_stats: {
        Args: { p_from_date: string; p_to_date: string }
        Returns: Json
      }
      get_inbox: {
        Args: { p_limit?: number }
        Returns: {
          id: string
          last_at: string
          last_body: string
          last_sender_id: string
          listing_cover_path: string
          listing_id: string
          listing_status: string
          listing_title: string
          other_avatar_url: string
          other_id: string
          other_name: string
          role: string
          unread_count: number
        }[]
      }
      get_my_account: {
        Args: never
        Returns: {
          banned_reason: string
          is_banned: boolean
          role: string
        }[]
      }
      get_my_listing_location: {
        Args: { p_listing_id: string }
        Returns: {
          lat: number
          lng: number
        }[]
      }
      get_my_phone: { Args: never; Returns: string }
      get_public_stats: { Args: never; Returns: Json }
      get_seller_phone: { Args: { p_listing_id: string }; Returns: string }
      get_seller_phone_hint: { Args: { p_listing_id: string }; Returns: string }
      get_unread_conversation_count: { Args: never; Returns: number }
      is_admin: { Args: never; Returns: boolean }
      is_user_banned: { Args: { p_user_id: string }; Returns: boolean }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: number
      }
      mark_listing_sold: {
        Args: {
          p_buyer_id?: string
          p_final_price?: number
          p_listing_id: string
        }
        Returns: string
      }
      search_listings: {
        Args: {
          p_attr_filters?: Json
          p_category_ids?: number[]
          p_keyword?: string
          p_lat?: number
          p_limit?: number
          p_lng?: number
          p_max_price?: number
          p_min_price?: number
          p_offset?: number
          p_radius_km?: number
          p_sort?: string
        }
        Returns: {
          category_id: number
          cover_image_path: string
          created_at: string
          distance_m: number
          district: string
          id: string
          lat: number
          lng: number
          parent_category_id: number
          price: number
          price_unit: string
          province: string
          title: string
        }[]
      }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      anonymous_attributes: {
        Row: {
          acquisition_url: string | null
          browser_type: string | null
          created_at: string
          document_referrer: string | null
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          id: string
          model_: string | null
          raw_uaparser: string | null
          raw_useragent: string | null
          screen_size_type: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          acquisition_url?: string | null
          browser_type?: string | null
          created_at?: string
          document_referrer?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          id?: string
          model_?: string | null
          raw_uaparser?: string | null
          raw_useragent?: string | null
          screen_size_type?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          acquisition_url?: string | null
          browser_type?: string | null
          created_at?: string
          document_referrer?: string | null
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          id?: string
          model_?: string | null
          raw_uaparser?: string | null
          raw_useragent?: string | null
          screen_size_type?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_attributes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "anonymous_users"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymous_users: {
        Row: {
          abusing: boolean
          admin: boolean | null
          aquisition_url: string | null
          category: string | null
          created_at: string
          email: string | null
          email_lists: string[]
          id: string
          posthog_distinct_id: string | null
          vip_pipeline: boolean
        }
        Insert: {
          abusing?: boolean
          admin?: boolean | null
          aquisition_url?: string | null
          category?: string | null
          created_at?: string
          email?: string | null
          email_lists?: string[]
          id?: string
          posthog_distinct_id?: string | null
          vip_pipeline?: boolean
        }
        Update: {
          abusing?: boolean
          admin?: boolean | null
          aquisition_url?: string | null
          category?: string | null
          created_at?: string
          email?: string | null
          email_lists?: string[]
          id?: string
          posthog_distinct_id?: string | null
          vip_pipeline?: boolean
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          reference_id: string | null
          transaction_type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          email: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          reference_id?: string | null
          transaction_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      front_emails: {
        Row: {
          created_at: string | null
          email_data: Json
          id: string
        }
        Insert: {
          created_at?: string | null
          email_data: Json
          id?: string
        }
        Update: {
          created_at?: string | null
          email_data?: Json
          id?: string
        }
        Relationships: []
      }
      model_runs: {
        Row: {
          comment: string | null
          created_at: string
          email: string | null
          feedback_notes: string | null
          gift_link_view_count: number | null
          id: string
          input_image_url: string | null
          metadata: Json | null
          original_output_image_url: string[] | null
          output_image_url: string[] | null
          payment_source: string | null
          price_variant_group: string | null
          processing_time_ms: number | null
          purchased: boolean
          reaction: string | null
          resolved: boolean | null
          share_link_view_count: number | null
          status: string
          stripe_transaction_id: string | null
          usage_openai: Json | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          email?: string | null
          feedback_notes?: string | null
          gift_link_view_count?: number | null
          id?: string
          input_image_url?: string | null
          metadata?: Json | null
          original_output_image_url?: string[] | null
          output_image_url?: string[] | null
          payment_source?: string | null
          price_variant_group?: string | null
          processing_time_ms?: number | null
          purchased?: boolean
          reaction?: string | null
          resolved?: boolean | null
          share_link_view_count?: number | null
          status?: string
          stripe_transaction_id?: string | null
          usage_openai?: Json | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          email?: string | null
          feedback_notes?: string | null
          gift_link_view_count?: number | null
          id?: string
          input_image_url?: string | null
          metadata?: Json | null
          original_output_image_url?: string[] | null
          output_image_url?: string[] | null
          payment_source?: string | null
          price_variant_group?: string | null
          processing_time_ms?: number | null
          purchased?: boolean
          reaction?: string | null
          resolved?: boolean | null
          share_link_view_count?: number | null
          status?: string
          stripe_transaction_id?: string | null
          usage_openai?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_runs_user_fk"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "anonymous_users"
            referencedColumns: ["id"]
          },
        ]
      }
      physical_mail_orders: {
        Row: {
          amount: number
          created_at: string
          currency: string
          delivered_at: string | null
          email: string | null
          id: string
          items: Json | null
          metadata: Json | null
          model_run_id: string | null
          order_number: string | null
          order_type: string
          output_image_url: string | null
          payment_intent_id: string
          shipped_at: string | null
          shipping_address: Json
          status: string
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          model_run_id?: string | null
          order_number?: string | null
          order_type?: string
          output_image_url?: string | null
          payment_intent_id: string
          shipped_at?: string | null
          shipping_address: Json
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          delivered_at?: string | null
          email?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          model_run_id?: string | null
          order_number?: string | null
          order_type?: string
          output_image_url?: string | null
          payment_intent_id?: string
          shipped_at?: string | null
          shipping_address?: Json
          status?: string
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "physical_mail_orders_model_run_id_fkey"
            columns: ["model_run_id"]
            isOneToOne: false
            referencedRelation: "model_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "physical_mail_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "anonymous_users"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_captured_events: {
        Row: {
          amount: number | null
          created_timestamp: number | null
          created_timestamp_est: string | null
          credits: string | null
          id: number
          model_run_id: string | null
          output_image_url: string | null
          pack_type: string | null
          payload: Json | null
          payment_source: string | null
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_timestamp?: number | null
          created_timestamp_est?: string | null
          credits?: string | null
          id?: number
          model_run_id?: string | null
          output_image_url?: string | null
          pack_type?: string | null
          payload?: Json | null
          payment_source?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_timestamp?: number | null
          created_timestamp_est?: string | null
          credits?: string | null
          id?: number
          model_run_id?: string | null
          output_image_url?: string | null
          pack_type?: string | null
          payload?: Json | null
          payment_source?: string | null
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_retool_storage: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          image_1: string | null
          image_1_approved: Json | null
          image_1_processed: string | null
          image_2: string | null
          image_2_approved: Json | null
          image_2_processed: string | null
          image_3: string | null
          image_3_approved: Json | null
          image_3_processed: string | null
          image_4: string | null
          image_4_approved: Json | null
          image_4_processed: string | null
          model_run_id: string
          notes: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          image_1?: string | null
          image_1_approved?: Json | null
          image_1_processed?: string | null
          image_2?: string | null
          image_2_approved?: Json | null
          image_2_processed?: string | null
          image_3?: string | null
          image_3_approved?: Json | null
          image_3_processed?: string | null
          image_4?: string | null
          image_4_approved?: Json | null
          image_4_processed?: string | null
          model_run_id: string
          notes?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          image_1?: string | null
          image_1_approved?: Json | null
          image_1_processed?: string | null
          image_2?: string | null
          image_2_approved?: Json | null
          image_2_processed?: string | null
          image_3?: string | null
          image_3_approved?: Json | null
          image_3_processed?: string | null
          image_4?: string | null
          image_4_approved?: Json | null
          image_4_processed?: string | null
          model_run_id?: string
          notes?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: []
      }
      support_retool_tools: {
        Row: {
          created_at: string | null
          id: string
          snippet_name: string | null
          snippet_tags: string | null
          snippet_text: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          snippet_name?: string | null
          snippet_tags?: string | null
          snippet_text?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          snippet_name?: string | null
          snippet_tags?: string | null
          snippet_text?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      support_search_images: {
        Row: {
          created_at: string | null
          id: number
          json_description: Json | null
          json_description_text: string | null
          model_run_id: string
          output_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          json_description?: Json | null
          json_description_text?: string | null
          model_run_id: string
          output_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          json_description?: Json | null
          json_description_text?: string | null
          model_run_id?: string
          output_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_model_run"
            columns: ["model_run_id"]
            isOneToOne: false
            referencedRelation: "model_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      support_search_images_start: {
        Row: {
          created_at: string | null
          id: number
          json_description: Json | null
          model_run_id: string
          output_image_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          json_description?: Json | null
          model_run_id: string
          output_image_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          json_description?: Json | null
          model_run_id?: string
          output_image_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_model_run_start"
            columns: ["model_run_id"]
            isOneToOne: false
            referencedRelation: "model_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_user_interactions: {
        Args: { user_id_param: string }
        Returns: {
          count: number
        }[]
      }
      exec_sql: {
        Args: { query: string }
        Returns: Json
      }
      generate_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_column: {
        Args: { table_name: string; column_name: string; row_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

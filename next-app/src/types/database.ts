export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          created_at: string
          last_login: string
          payment_confirmed: boolean
          payment_date: string | null
          payment_transaction_id: string | null
          plans_generated: number
          revisions_remaining: number
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          created_at?: string
          last_login?: string
          payment_confirmed?: boolean
          payment_date?: string | null
          payment_transaction_id?: string | null
          plans_generated?: number
          revisions_remaining?: number
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          created_at?: string
          last_login?: string
          payment_confirmed?: boolean
          payment_date?: string | null
          payment_transaction_id?: string | null
          plans_generated?: number
          revisions_remaining?: number
        }
      }
      wedding_plans: {
        Row: {
          id: string
          user_id: string
          created_at: string
          updated_at: string
          current_plan: Json
          initial_preferences: Json
          revision_history: Json[]
          research_log: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          updated_at?: string
          current_plan: Json
          initial_preferences: Json
          revision_history?: Json[]
          research_log?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          updated_at?: string
          current_plan?: Json
          initial_preferences?: Json
          revision_history?: Json[]
          research_log?: Json | null
        }
      }
    }
  }
}

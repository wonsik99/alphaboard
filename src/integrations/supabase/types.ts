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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          symbol: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          symbol: string
          name: string
          purchase_price: number
          quantity: number
          purchased_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          name: string
          purchase_price: number
          quantity: number
          purchased_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          name?: string
          purchase_price?: number
          quantity?: number
          purchased_at?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sentiment_records: {
        Row: {
          id: string
          symbol: string
          score: number
          article_count: number
          summary: string | null
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          symbol: string
          score: number
          article_count?: number
          summary?: string | null
          recorded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          symbol?: string
          score?: number
          article_count?: number
          summary?: string | null
          recorded_at?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}


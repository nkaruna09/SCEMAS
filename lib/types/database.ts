export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      zones: {
        Row: {
          id: string
          name: string
          geojson_boundary: Json | null
        }
        Insert: Omit<Database['public']['Tables']['zones']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['zones']['Insert']>
      }
      sensors: {
        Row: {
          id: string
          name: string
          zone_id: string
          metric_type: string
          status: 'active' | 'inactive' | 'maintenance'
          approved: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sensors']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['sensors']['Insert']>
      }
      telemetry_readings: {
        Row: {
          id: string
          sensor_id: string
          zone_id: string
          metric_type: string
          value: number
          timestamp: string
        }
        Insert: Omit<Database['public']['Tables']['telemetry_readings']['Row'], 'id' | 'timestamp'>
        Update: never
      }
      alert_rules: {
        Row: {
          id: string
          metric_type: string
          threshold_value: number
          operator: '>' | '<' | '>=' | '<=' | '='
          severity: 'low' | 'medium' | 'high' | 'critical'
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['alert_rules']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['alert_rules']['Row'], 'id' | 'created_at' | 'created_by'>>
      }
      alerts: {
        Row: {
          id: string
          rule_id: string
          sensor_id: string
          value: number
          status: 'active' | 'acknowledged' | 'resolved'
          triggered_at: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'triggered_at'>
        Update: Partial<Pick<Database['public']['Tables']['alerts']['Row'], 'status' | 'resolved_at' | 'resolved_by'>>
      }
      user_roles: {
        Row: {
          user_id: string
          role: 'city_operator' | 'system_admin' | 'government_official' | 'emergency_services'
        }
        Insert: Database['public']['Tables']['user_roles']['Row']
        Update: Pick<Database['public']['Tables']['user_roles']['Row'], 'role'>
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          action: string
          table_name: string
          old_val: Json | null
          new_val: Json | null
          timestamp: string
        }
        Insert: never
        Update: never
      }
    }
  }
}

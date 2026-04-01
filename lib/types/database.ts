export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export type AuditObject = { [key: string]: Json } // or Record<string, any>

export type AuditLogRow = {
  id: string
  timestamp: string
  user_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string
  table_name: string
  old_val: AuditObject | null
  new_val: AuditObject | null
}

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
        Update: Partial<AuditLogRow> & { id?: string }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
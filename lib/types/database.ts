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

export type AlertRuleRow = {
  id: string
  metric_type: string
  threshold_value: number
  operator: '>' | '<' | '>=' | '<=' | '='
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at?: string
  created_by?: string
}

export type SensorRow = {
  id: string
  name: string
  zone_id: string
  metric_type: string
  status: string
  approved?: boolean
  latitude?: number | null
  longitude?: number | null
  created_at?: string
}

export type AlertRow = {
  id: string
  rule_id: string
  sensor_id: string
  value: number
  severity?: string
  alert_type?: 'rule' | 'trend' | 'predicted'
  status: 'active' | 'acknowledged' | 'resolved'
  triggered_at: string
  resolved_at?: string
  resolved_by?: string
}

export type AlertNotificationRow = {
  id: string
  alert_id: string
  sensor_id: string
  telemetry_type: string
  measurement: number
  threshold_value: number
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  rule_id?: string
}

export type Database = {
  public: {
    Tables: {
      audit_log: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
        Update: Partial<AuditLogRow> & { id?: string }
      }
      alert_rules: {
        Row: AlertRuleRow
        Insert: Omit<AlertRuleRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<AlertRuleRow>
      }
      sensors: {
        Row: SensorRow
        Insert: Omit<SensorRow, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<SensorRow>
      }
      alerts: {
        Row: AlertRow
        Insert: Omit<AlertRow, 'id' | 'triggered_at'> & { id?: string; triggered_at?: string }
        Update: Partial<AlertRow>
      }
      alert_notifications: {
        Row: AlertNotificationRow
        Insert: Omit<AlertNotificationRow, 'id'> & { id?: string }
        Update: Partial<AlertNotificationRow>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
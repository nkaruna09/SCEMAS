'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'
import GraphDisplay from '@/components/GraphDisplay'

type Alert = Database['public']['Tables']['alerts']['Row'] & {
  alert_rules?: Database['public']['Tables']['alert_rules']['Row']
  sensors?: Database['public']['Tables']['sensors']['Row']
}

type Sensor = Database['public']['Tables']['sensors']['Row']
type AuditLog = Database['public']['Tables']['audit_log']['Row']

export default function SystemAdminDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAll()

    const channel = supabase
      .channel('system-admin-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAll()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchAll = async () => {
    const [alertRes, sensorRes, auditRes] = await Promise.all([
      supabase
        .from('alerts')
        .select('*, alert_rules (id, metric_type, threshold_value, operator, severity), sensors (id, name, metric_type, zone_id)')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(4),
      supabase
        .from('sensors')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5),
    ])

    if (!alertRes.error) setAlerts(alertRes.data || [])
    if (!sensorRes.error) setSensors(sensorRes.data || [])
    if (!auditRes.error) setAuditLogs(auditRes.data || [])
    setLoading(false)
  }

  const activeAlertCount = alerts.length
  const criticalCount = alerts.filter(a => a.alert_rules?.severity === 'critical').length
  const activeSensors = sensors.filter(s => s.status === 'active').length
  const offlineSensors = sensors.filter(s => s.status !== 'active').length

  return (
    <main className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/*Title header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          System Administrator Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          System health, alerts, telemetry, and administrative controls.
        </p>
      </div>

      {/* quick view stats */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Alerts', value: activeAlertCount.toString(), color: 'text-red-600' },
          { label: 'Critical Severity', value: criticalCount.toString(), color: 'text-orange-600' },
          { label: 'Active Sensors', value: loading ? '...' : activeSensors.toString(), color: 'text-green-600' },
          { label: 'Offline / Pending', value: loading ? '...' : offlineSensors.toString(), color: 'text-yellow-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Graph (display graphs from backend) */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Telemetry Graphs
          </h2>
        </div>

        {/* Scrollable container */}
        <div className="h-64 bg-gray-100 rounded-lg overflow-y-auto p-4">
          <div className="space-y-4">
            <GraphDisplay />
          </div>
        </div>
      </section>

      {/* Alerts and logs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Active Alerts</h2>
            <Link href="/system-admin/alerts" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No active alerts</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">{alert.sensors?.name}</p>
                    <p className="text-sm text-gray-500">{new Date(alert.triggered_at).toLocaleString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    alert.alert_rules?.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.alert_rules?.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                    alert.alert_rules?.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {alert.alert_rules?.severity || 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* live audit log */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Audit Logs</h2>
            <Link href="/system-admin/audit-log" className="text-sm text-blue-600 hover:underline">View All</Link>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No audit entries yet</p>
          ) : (
            <div className="space-y-2 text-sm">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex justify-between text-gray-700 border-b pb-2 last:border-none">
                  <span><span className="font-medium">{log.action}</span> on {log.table_name}</span>
                  <span className="text-gray-400 text-xs">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* controls and System info */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* live sensor status */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
            <Link href="/system-admin/sensors" className="text-sm text-blue-600 hover:underline">Manage</Link>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : sensors.length === 0 ? (
            <p className="text-sm text-gray-500">No sensors registered</p>
          ) : (
            <div className="space-y-2 text-sm">
              {sensors.map((s) => (
                <div key={s.id} className="flex justify-between items-center border-b pb-2 last:border-none">
                  <span className="text-gray-700">{s.name} <span className="text-gray-400">({s.metric_type})</span></span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === 'active' ? 'bg-green-100 text-green-600' :
                    s.status === 'maintenance' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* admin level controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">Admin Controls</h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/system-admin/users" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700">Manage Users</Link>
            <Link href="/system-admin/alerts" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300">View Alerts</Link>
            <Link href="/system-admin/alert-rules" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300">Edit Rules</Link>
            <Link href="/system-admin/sensors" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300">Manage Sensors</Link>
            <Link href="/system-admin/audit-log" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300">Audit Log</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Alert = Database['public']['Tables']['alerts']['Row'] & {
  alert_rules?: Database['public']['Tables']['alert_rules']['Row']
  sensors?: Database['public']['Tables']['sensors']['Row']
}

export default function SystemAdminDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchActiveAlerts()
  }, [])

  const fetchActiveAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('alerts')
        .select(`
          *,
          alert_rules (id, metric_type, threshold_value, operator, severity),
          sensors (id, name, metric_type, zone_id)
        `)
        .eq('status', 'active')
        .order('triggered_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeAlertCount = alerts.length
  const criticalCount = alerts.filter(a => a.alert_rules?.severity === 'critical').length

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
          { label: "Active Alerts", value: activeAlertCount.toString(), color: "text-red-600" },
          { label: "Critical Severity", value: criticalCount.toString(), color: "text-orange-600" },
          { label: "System Status", value: "Normal", color: "text-green-600" },
          { label: "Last Update", value: "Now", color: "text-gray-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-5 rounded-2xl shadow-sm border" >
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${stat.color}`}> {stat.value} </p>
          </div>
        ))}
      </section>

      {/* Graph (placeholder for graph-generator utility) */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900"> Telemetry Graphs</h2>
          <button className="text-sm text-blue-600 hover:underline"> View All </button>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-100 rounded-lg">
          <p className="text-gray-500">Graph visualization coming soon</p>
        </div>
      </section>

      {/* Alerts and logs */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900"> Active Alerts </h2>
            <Link href="/system-admin/alerts" className="text-sm text-blue-600 hover:underline"> View All </Link>
          </div>
          {loading ? (
            <div className="text-center text-gray-500">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No active alerts</div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="p-4 rounded-xl border bg-gray-50 flex justify-between items-center" >
                  <div>
                    <p className="font-medium text-gray-800">{alert.sensors?.name}</p>
                    <p className="text-sm text-gray-500">{new Date(alert.triggered_at).toLocaleString()}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      alert.alert_rules?.severity === "critical"
                        ? "bg-red-100 text-red-600"
                        : alert.alert_rules?.severity === "high"
                        ? "bg-orange-100 text-orange-600"
                        : alert.alert_rules?.severity === "medium"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {alert.alert_rules?.severity || 'unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/*audit log */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> Audit Logs </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>• System initialized</p>
            <p>• Updates available</p>
            <p>• Last scan completed</p>
          </div>
        </div>
      </section>

      {/* controls and System info */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* status updates */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900">
            System Status
          </h2>

          <div className="space-y-2 text-sm text-gray-700">
            <p>• Telemetry ingestion: <span className="text-green-600">Operational</span></p>
            <p>• Alert processing: <span className="text-green-600">Operational</span></p>
            <p>• Graph generator: <span className="text-yellow-600">Delayed</span></p>
            <p>• API endpoint: <span className="text-green-600">Operational</span></p>
          </div>
        </div>

        {/* admin level controls */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 text-gray-900"> Admin Controls </h2>
          <div className="flex flex-wrap gap-3">
            <Link href="/system-admin/users" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700"> Manage Users </Link>
            <Link href="/system-admin/alerts" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> View Alerts </Link>
            <Link href="/system-admin/alert-rules" className="px-4 py-2 bg-gray-200 rounded-xl text-sm hover:bg-gray-300"> Edit Rules </Link>
            <button className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-sm hover:bg-red-200"> Resolve Alerts </button>
          </div>
        </div>
      </section>
    </main>
  )
}
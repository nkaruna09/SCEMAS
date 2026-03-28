'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Alert = Database['public']['Tables']['alerts']['Row'] & {
  alert_rules?: Database['public']['Tables']['alert_rules']['Row']
  sensors?: Database['public']['Tables']['sensors']['Row']
}

export default function CityOperatorDashboard() {
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
    <main className="p-8">
      <h1 className="text-2xl font-bold">City Operator Dashboard</h1>
      <p className="text-gray-500 mt-1">Telemetry overview, thresholds, and active alerts.</p>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Active Alerts</p>
          <p className="text-3xl font-bold text-red-600">{activeAlertCount}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Critical Severity</p>
          <p className="text-3xl font-bold text-orange-600">{criticalCount}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">System Status</p>
          <p className="text-3xl font-bold text-blue-600">Normal</p>
        </div>
      </div>

      {/* Recent Alerts Section */}
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-lg font-semibold">Recent Active Alerts</h2>
            <p className="text-sm text-gray-500 mt-1">Latest alerts requiring attention</p>
          </div>
          <Link
            href="/city-operator/alerts"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
          >
            View All Alerts
          </Link>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-500">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No active alerts. All systems normal!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Sensor</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Metric Type</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Value</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Severity</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Triggered At</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {alerts.slice(0, 5).map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {alert.sensors?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {alert.alert_rules?.metric_type || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">
                      {alert.value.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        alert.alert_rules?.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        alert.alert_rules?.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        alert.alert_rules?.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alert.alert_rules?.severity || 'unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links Section */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <Link
          href="/city-operator/alerts"
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-red-500"
        >
          <h3 className="font-semibold text-gray-900">View All Alerts</h3>
          <p className="text-sm text-gray-500 mt-2">Manage and respond to active alerts</p>
        </Link>
        <Link
          href="/city-operator/alert-rules"
          className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-blue-500"
        >
          <h3 className="font-semibold text-gray-900">Alert Rules</h3>
          <p className="text-sm text-gray-500 mt-2">Configure thresholds and severity levels</p>
        </Link>
        <div className="p-6 bg-white rounded-lg shadow border-l-4 border-gray-500">
          <h3 className="font-semibold text-gray-900">System Status</h3>
          <p className="text-sm text-gray-500 mt-2">All sensors operational</p>
        </div>
      </div>
    </main>
  )
}

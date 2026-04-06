'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/types/database'

type Alert = Database['public']['Tables']['alerts']['Row'] & {
  alert_rules?: Database['public']['Tables']['alert_rules']['Row']
  sensors?: Database['public']['Tables']['sensors']['Row']
}

const statusColors: Record<Alert['status'], string> = {
  active: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
}

const severityColors: Record<string, string> = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800',
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved'>('all')
  const supabase = createClient()

  useEffect(() => {
    fetchAlerts()

    const channel = supabase
      .channel('system-admin-alerts-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchAlerts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchAlerts = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('alerts')
        .select(`
          *,
          alert_rules (id, metric_type, threshold_value, operator, severity),
          sensors (id, name, metric_type, zone_id)
        `)
        .order('triggered_at', { ascending: false })
        .limit(100)

      const { data, error } = await query

      if (error) throw error
      setAlerts(data || [])
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      // Acknowledge via API route (forwards to FastAPI AlertEvaluator)
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Failed to acknowledge alert')
      fetchAlerts()
    } catch (error) {
      console.error('Error acknowledging alert:', error)
    }
  }

  const handleResolve = async (alertId: string) => {
    try {
      // resolve and fwd to AlertEvaluator
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Failed to resolve alert')
      fetchAlerts()
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.status === filter)

  if (loading) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-gray-500 mt-1">Loading alerts...</p>
      </main>
    )
  }

  return (
    <main className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Alerts</h1>
        <p className="text-gray-500 mt-1">Active and recent alerts across all sensors.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {(['all', 'active', 'acknowledged', 'resolved'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No {filter === 'all' ? 'alerts' : filter + ' alerts'} found.
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Sensor</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Metric Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Value</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Threshold</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Severity</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Triggered</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {alert.sensors?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {alert.alert_rules?.metric_type || alert.sensors?.metric_type || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">
                    {alert.value.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-900">
                    {alert.alert_type === 'predicted'
                      ? <span className="text-gray-400 text-xs">predicted: {alert.alert_rules?.operator} {alert.alert_rules?.threshold_value}</span>
                      : !alert.alert_rules
                        ? <span className="text-gray-400 text-xs">anomaly detected</span>
                        : `${alert.alert_rules.operator} ${alert.alert_rules.threshold_value}`}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {alert.alert_type === 'predicted' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">predicted</span>
                    ) : !alert.alert_rules ? (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">trend</span>
                    ) : (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${severityColors[alert.alert_rules.severity ?? 'low']}`}>
                        {alert.alert_rules.severity}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[alert.status]}`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {alert.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-yellow-600 hover:text-yellow-800 font-medium"
                        >
                          Acknowledge
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="text-green-600 hover:text-green-800 font-medium"
                        >
                          Resolve
                        </button>
                      </>
                    )}
                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="text-green-600 hover:text-green-800 font-medium"
                      >
                        Resolve
                      </button>
                    )}
                    {alert.status === 'resolved' && (
                      <span className="text-gray-500 text-xs">
                        Resolved {alert.resolved_at ? new Date(alert.resolved_at).toLocaleDateString() : 'N/A'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Active Alerts</p>
          <p className="text-2xl font-bold text-red-600">
            {alerts.filter(a => a.status === 'active').length}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Acknowledged</p>
          <p className="text-2xl font-bold text-yellow-600">
            {alerts.filter(a => a.status === 'acknowledged').length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Resolved</p>
          <p className="text-2xl font-bold text-green-600">
            {alerts.filter(a => a.status === 'resolved').length}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Total Alerts</p>
          <p className="text-2xl font-bold text-blue-600">
            {alerts.length}
          </p>
        </div>
      </div>
    </main>
  )
}

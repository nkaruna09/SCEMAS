'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'

const SensorMap = dynamic(() => import('@/components/SensorMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
      Loading map...
    </div>
  ),
})

interface Alert {
  id: string
  sensor_id: string
  value: number
  status: string
  triggered_at: string
  alert_rules: {
    metric_type: string
    threshold_value: number
    operator: string
    severity: string
  } | null
}

export default function EmergencyDashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchCriticalAlerts()

    // Real-time updates for alerts
    const channel = supabase
      .channel('emergency-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchCriticalAlerts()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchCriticalAlerts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/public/alerts?status=active')
      if (!response.ok) throw new Error('Failed to fetch alerts')

      const data = await response.json()
      // Filter for high and critical severity alerts
      const criticalAlerts = (data.alerts || []).filter((alert: Alert) =>
        alert.alert_rules?.severity === 'critical' || alert.alert_rules?.severity === 'high'
      )
      setAlerts(criticalAlerts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Failed to acknowledge alert')

      // Update local state
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
      ))
    } catch (err) {
      alert('Failed to acknowledge alert: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleResolve = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
      })
      if (!response.ok) throw new Error('Failed to resolve alert')

      // Update local state
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (err) {
      alert('Failed to resolve alert: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Emergency Services Dashboard</h1>
      <p className="text-gray-500 mb-8">High-severity and critical alerts requiring immediate attention.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sensor Map */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sensor Map</h2>
          <div className="h-96">
            <SensorMap />
          </div>
        </div>

        {/* Critical Alerts List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Critical Alerts</h2>
          {loading && <p>Loading alerts...</p>}
          {error && <p className="text-red-500">Error: {error}</p>}
          {!loading && !error && alerts.length === 0 && (
            <p className="text-gray-500">No critical alerts at this time.</p>
          )}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div key={alert.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium text-red-800">
                      {alert.alert_rules?.metric_type || 'Unknown'} Alert
                    </span>
                    <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                      {alert.alert_rules?.severity?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(alert.triggered_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  Sensor: {alert.sensor_id} | Value: {alert.value} {alert.alert_rules?.operator} {alert.alert_rules?.threshold_value}
                </p>
                <div className="flex gap-2">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

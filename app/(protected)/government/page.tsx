'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RealtimeGraphDisplay from '@/components/RealtimeGraphDisplay'
import { createClient } from '@/lib/supabase/client'
import type { SensorRow, AlertRow } from '@/lib/types/database'

interface Telemetry {
  sensor_id: string
  value: number
  timestamp: string
}

interface AlertOverview {
  sensor_id: string
  severity: string
  status: string
}

interface SensorOverview extends SensorRow {
  latestTelemetry?: Telemetry
  activeAlerts: AlertOverview[]
}

export default function GovernmentDashboard() {
  const [sensors, setSensors] = useState<SensorOverview[]>([])
  const [stats, setStats] = useState({
    totalSensors: 0,
    activeAlerts: 0,
    criticalAlerts: 0,
    resolvedToday: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasInitialized, setHasInitialized] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // Only load once on mount
    if (!hasInitialized) {
      fetchData()
      setHasInitialized(true)
    }

    // Subscribe for updates - only alert changes, not telemetry
    const alertsChannel = supabase
      .channel('government-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        // Incrementally update alerts instead of full refetch
        if (payload.eventType === 'INSERT') {
          // Increment active alerts count
          setStats((prev) => ({
            ...prev,
            activeAlerts: prev.activeAlerts + 1,
            criticalAlerts:
              payload.new.severity === 'critical'
                ? prev.criticalAlerts + 1
                : prev.criticalAlerts,
          }))
        } else if (payload.eventType === 'UPDATE') {
          // If alert status changed from active to resolved
          if (payload.old.status === 'active' && payload.new.status === 'resolved') {
            setStats((prev) => ({
              ...prev,
              activeAlerts: Math.max(0, prev.activeAlerts - 1),
              criticalAlerts:
                payload.old.severity === 'critical'
                  ? Math.max(0, prev.criticalAlerts - 1)
                  : prev.criticalAlerts,
            }))
          }
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(alertsChannel)
    }
  }, [hasInitialized])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch 5 sensors
      const { data: sensorsData, error: sensorsError } = await supabase
        .from('sensors')
        .select('*')
        .eq('approved', true)
        .eq('status', 'active')
        .limit(5)

      if (sensorsError) throw sensorsError

      const sensors = (sensorsData as SensorRow[]) || []

      // Fetch latest telemetry for these sensors
      const sensorIds = sensors.map(s => s.id)
      const { data: telemetryData, error: telemetryError } = await supabase
        .from('telemetry_readings')
        .select('sensor_id, value, timestamp')
        .in('sensor_id', sensorIds)
        .order('timestamp', { ascending: false })

      if (telemetryError) throw telemetryError

      const telemetries = (telemetryData as Telemetry[]) || []

      // Group telemetry by sensor
      const latestTelemetry: Record<string, Telemetry> = {}
      telemetries.forEach(t => {
        if (!latestTelemetry[t.sensor_id]) {
          latestTelemetry[t.sensor_id] = t
        }
      })

      // Fetch active alerts for these sensors
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('sensor_id, severity, status')
        .in('sensor_id', sensorIds)
        .eq('status', 'active')

      if (alertsError) throw alertsError

      const alerts = (alertsData as AlertOverview[]) || []

      // Group alerts by sensor
      const alertsBySensor: Record<string, AlertOverview[]> = {}
      sensorIds.forEach(id => alertsBySensor[id] = [])
      alerts.forEach(alert => {
        if (!alertsBySensor[alert.sensor_id]) alertsBySensor[alert.sensor_id] = []
        alertsBySensor[alert.sensor_id].push(alert)
      })

      const sensorOverviews: SensorOverview[] = sensors.map(sensor => ({
        ...sensor,
        latestTelemetry: latestTelemetry[sensor.id],
        activeAlerts: alertsBySensor[sensor.id] || [],
      }))

      setSensors(sensorOverviews)

      // Calculate stats
      const allActiveAlerts = alerts
      const criticalAlerts = allActiveAlerts.filter(a => a.severity === 'critical')
      const resolvedToday = await getResolvedToday()

      setStats({
        totalSensors: sensorOverviews.length,
        activeAlerts: allActiveAlerts.length,
        criticalAlerts: criticalAlerts.length,
        resolvedToday,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const getResolvedToday = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('alerts')
      .select('resolved_at')
      .eq('status', 'resolved')
      .gte('resolved_at', today)

    if (error) return 0
    return data?.length || 0
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Government Official Dashboard</h1>
      <p className="text-gray-500 mb-8">Reports and executive environmental overview for monitored sensors.</p>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Monitored Sensors</h3>
          <p className="text-3xl font-bold text-blue-600">{loading ? '...' : stats.totalSensors}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Active Alerts</h3>
          <p className="text-3xl font-bold text-orange-600">{loading ? '...' : stats.activeAlerts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Critical Alerts</h3>
          <p className="text-3xl font-bold text-red-600">{loading ? '...' : stats.criticalAlerts}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700">Resolved Today</h3>
          <p className="text-3xl font-bold text-green-600">{loading ? '...' : stats.resolvedToday}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800">Error loading data: {error}</p>
        </div>
      )}

      {/* Sensor Overview Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Sensor Overview</h2>
        {loading ? (
          <p>Loading sensors...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Sensor</th>
                  <th className="px-4 py-2 text-left">Metric</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Latest Value</th>
                  <th className="px-4 py-2 text-left">Active Alerts</th>
                </tr>
              </thead>
              <tbody>
                {sensors.map(sensor => (
                  <tr key={sensor.id} className="border-t">
                    <td className="px-4 py-2 font-medium">{sensor.name}</td>
                    <td className="px-4 py-2">{sensor.metric_type}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        sensor.status === 'active' ? 'bg-green-100 text-green-800' :
                        sensor.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sensor.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {sensor.latestTelemetry ? (
                        <span>
                          {sensor.latestTelemetry.value} ({new Date(sensor.latestTelemetry.timestamp).toLocaleTimeString()})
                        </span>
                      ) : (
                        <span className="text-gray-500">No data</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {sensor.activeAlerts.length > 0 ? (
                        <div className="space-y-1">
                          {sensor.activeAlerts.map((alert, idx) => (
                            <span key={idx} className={`px-2 py-1 text-xs rounded ${
                              alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {alert.severity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-green-600">None</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <Link
            href="/government/reports"
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            View Reports
          </Link>
          <Link
            href="/system-admin/alert-rules"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Manage Alert Rules
          </Link>
          <Link
            href="/system-admin/sensors"
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            View Sensors
          </Link>
        </div>
      </div>

      {/* Environmental Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Environmental Overview</h2>
        <RealtimeGraphDisplay />
      </div>
    </main>
  )
}

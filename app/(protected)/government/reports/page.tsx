'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import RealtimeGraphDisplay from '@/components/RealtimeGraphDisplay'

interface AlertReport {
  id: string
  sensor_name: string
  metric_type: string
  value: number
  threshold_value: number
  operator: string
  severity: string
  triggered_at: string
  status: string
  resolved_at?: string
}

export default function Reports() {
  const supabase = createClient()
  const [alerts, setAlerts] = useState<AlertReport[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  useEffect(() => {
    fetchAlertReports()
  }, [])

  const fetchAlertReports = async (start?: string, end?: string) => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('alerts')
        .select(`
          id,
          value,
          status,
          triggered_at,
          resolved_at,
          sensors!inner(name),
          alert_rules!inner(metric_type, threshold_value, operator, severity)
        `)
        .order('triggered_at', { ascending: false })
        .limit(100)

      if (start && end) {
        query = query.gte('triggered_at', start).lte('triggered_at', end)
      }

      const { data, error } = await query

      if (error) throw error

      const formattedAlerts: AlertReport[] = data.map((alert: any) => ({
        id: alert.id,
        sensor_name: alert.sensors.name,
        metric_type: alert.alert_rules.metric_type,
        value: alert.value,
        threshold_value: alert.alert_rules.threshold_value,
        operator: alert.alert_rules.operator,
        severity: alert.alert_rules.severity,
        triggered_at: alert.triggered_at,
        status: alert.status,
        resolved_at: alert.resolved_at
      }))

      setAlerts(formattedAlerts)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => {
    fetchAlertReports(startDate, endDate)
  }

  const downloadSummary = () => {
    if (alerts.length === 0) return

    const headers = ['Triggered At', 'Sensor', 'Metric', 'Value', 'Threshold', 'Severity', 'Status', 'Resolved At']
    const csvContent = [
      headers.join(','),
      ...alerts.map(alert => [
        `"${new Date(alert.triggered_at).toLocaleString()}"`,
        `"${alert.sensor_name}"`,
        `"${alert.metric_type}"`,
        alert.value,
        `"${alert.operator} ${alert.threshold_value}"`,
        `"${alert.severity}"`,
        `"${alert.status}"`,
        alert.resolved_at ? `"${new Date(alert.resolved_at).toLocaleString()}"` : '-'
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `alerts_summary_${startDate || 'all'}_to_${endDate || 'now'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="p-8 bg-gray-50 min-h-screen space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">
          Environmental alert reports with sensor details, thresholds, and metrics.
        </p>
      </div>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Reports</h2>
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Filter
          </button>
          <button
            onClick={downloadSummary}
            disabled={alerts.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400"
          >
            Download Summary
          </button>
        </div>
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Alert Reports</h2>

        {loading ? (
          <div className="text-center text-gray-500 py-10">Loading alert reports...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-10">Error: {error}</div>
        ) : alerts.length === 0 ? (
          <div className="text-center text-gray-500 py-10">No alerts found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2">Triggered At</th>
                  <th className="px-3 py-2">Sensor</th>
                  <th className="px-3 py-2">Metric</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Threshold</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{alert.sensor_name}</td>
                    <td className="px-3 py-2 text-gray-700">{alert.metric_type}</td>
                    <td className="px-3 py-2 text-gray-700">{alert.value}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {alert.operator} {alert.threshold_value}
                    </td>
                    <td className="px-3 py-2 text-gray-700 capitalize">{alert.severity}</td>
                    <td className="px-3 py-2 text-gray-700 capitalize">{alert.status}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {alert.resolved_at ? new Date(alert.resolved_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white p-6 rounded-2xl shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Environmental Graphs</h2>
        <RealtimeGraphDisplay />
      </section>
    </main>
  )
}

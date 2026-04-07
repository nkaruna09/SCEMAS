'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Alert = {
  id: string
  value: number
  triggered_at: string
  alert_rules: { metric_type: string; threshold_value: number; operator: string; severity: string } | null
}
type Reading = {
  id: string
  sensor_id: string
  metric_type: string
  value: number
  timestamp: string
}
const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-red-600',
  high: 'bg-orange-500',
  medium: 'bg-yellow-400 text-black',
  low: 'bg-blue-500',
}
const UNITS: Record<string, string> = {
  temperature: '°C',
  humidity: '%',
  air_quality: ' AQI',
  noise: ' dB',
  pressure: ' hPa',
}

//poll every 30s for aerts
const POLL_MS = 30_000
export default function SignagePage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [readings, setReadings] = useState<Reading[]>([])
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])
  const fetchData = async () => {
    const [ar, tr] = await Promise.all([
      fetch('/api/public/alerts?status=active'),
      fetch('/api/public/telemetry?limit=50'),
    ])
    if (ar.ok) {
      //dedupe to one alert per sensor+metric, keep most recent
      const seen = new Set<string>()
      const latest: Alert[] = []
      for (const a of (await ar.json()).alerts ?? []) {
        const key = `${a.sensor_id}:${a.alert_rules?.metric_type}`
        if (!seen.has(key)) { seen.add(key); latest.push(a) }
      }
      setAlerts(latest)
    }
    if (tr.ok) {
      //put latest reading for each sensor/metric, remove duplicates
      const seen = new Set<string>()
      const latest: Reading[] = []
      for (const r of (await tr.json()).readings ?? []) {
        const key = `${r.sensor_id}:${r.metric_type}`
        if (!seen.has(key)) { seen.add(key); latest.push(r) }
      }
      setReadings(latest)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SCEMAS — City Environmental Monitor</h1>
        <p className="text-2xl font-mono text-gray-300" suppressHydrationWarning>{now.toLocaleTimeString()}</p>
      </div>

      <div>
        <h2 className="text-gray-400 uppercase text-sm tracking-widest mb-3">Active Alerts</h2>
        {alerts.length === 0 ? (
          <p className="text-green-400">No active alerts</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {alerts.map((a) => (
              <div key={a.id} className={`rounded-lg px-4 py-3 text-white ${SEVERITY_BG[a.alert_rules?.severity ?? 'low'] ?? 'bg-gray-700'}`}>
                <p className="font-semibold uppercase text-sm">{a.alert_rules?.metric_type}</p>
                <p className="text-2xl font-mono">{a.value}</p>
                <p className="text-xs opacity-75 mt-1">{a.alert_rules?.severity} · {new Date(a.triggered_at).toLocaleTimeString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-gray-400 uppercase text-sm tracking-widest mb-3">Current Readings</h2>
        {readings.length === 0 ? (
          <p className="text-gray-500">No sensor data</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {readings.map((r) => (
              <div key={r.id} className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-xs uppercase">{r.metric_type}</p>
                <p className="text-2xl font-mono mt-1">{r.value.toFixed(1)}{UNITS[r.metric_type] ?? ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-gray-600 text-xs" suppressHydrationWarning>Refreshes every 30s · {now.toLocaleDateString()}</p>

      <div className="pt-8 border-t border-gray-700 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:gap-4">
          <Link
            href="https://scemas-alpha.vercel.app/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg text-center font-medium transition"
          >
            Back to Login
          </Link>
          <a
            href="http://localhost:3000/api/public/sensors"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-center font-medium transition"
          >
            Developer Mode: Public API Endpoint
          </a>
          <a
            href="http://localhost:3000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg text-center font-medium transition"
          >
            View Public API Docs
          </a>
        </div>
      </div>
    </div>
  )
}
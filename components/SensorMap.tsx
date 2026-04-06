'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { createClient } from '@/lib/supabase/client'
import type { SensorRow } from '@/lib/types/database'

type SensorWithAlert = SensorRow & {
  zone_name?: string
  has_active_alert: boolean
}

const STATUS_COLORS: Record<string, string> = {
  active: '#16a34a',       // green-600
  maintenance: '#d97706',  // amber-600
  inactive: '#6b7280',     // gray-500
}

const METRIC_LABELS: Record<string, string> = {
  temperature: 'Temperature',
  humidity: 'Humidity',
  air_quality: 'Air Quality',
  pressure: 'Pressure',
  noise: 'Noise',
  pm2_5: 'PM2.5',
  pm10: 'PM10',
  co2_ppm: 'CO₂',
  no2_ppb: 'NO₂',
}

export default function SensorMap() {
  const [sensors, setSensors] = useState<SensorWithAlert[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchSensors()

    const channel = supabase
      .channel('sensor-map-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        fetchSensors()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const fetchSensors = async () => {
    try {
      const { data: sensorData, error: sensorError } = await supabase
        .from('sensors')
        .select('*, zones(name)')
        .eq('approved', true)

      if (sensorError) throw sensorError

      const { data: activeAlerts, error: alertError } = await supabase
        .from('alerts')
        .select('sensor_id')
        .eq('status', 'active')

      if (alertError) throw alertError

      const alertSensorIds = new Set(
        ((activeAlerts ?? []) as Array<{ sensor_id: string }>).map(a => a.sensor_id)
      )

      const enriched: SensorWithAlert[] = (sensorData || []).map((s: any) => ({
        ...s,
        zone_name: s.zones?.name ?? undefined,
        has_active_alert: alertSensorIds.has(s.id),
      }))

      setSensors(enriched)
    } catch (err) {
      console.error('SensorMap fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sensorsWithCoords = sensors.filter(s => s.latitude != null && s.longitude != null)

  const sensorsWithoutCoords = sensors.filter(s => s.latitude == null || s.longitude == null)

  // McMaster University as fallback centre when no sensors have coordinates yet
  const MC_MASTER: [number, number] = [43.2609, -79.9192]
  const centre: [number, number] = sensorsWithCoords.length > 0
    ? [
        sensorsWithCoords.reduce((s, x) => s + x.latitude!, 0) / sensorsWithCoords.length,
        sensorsWithCoords.reduce((s, x) => s + x.longitude!, 0) / sensorsWithCoords.length,
      ]
    : MC_MASTER

  if (loading) {
    return (
      <div className="w-full h-96 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
        Loading map...
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      <MapContainer
        center={centre}
        zoom={15}
        style={{ height: '400px', width: '100%', borderRadius: '0.5rem' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sensorsWithCoords.map(sensor => {
          const color = sensor.has_active_alert ? '#dc2626' : STATUS_COLORS[sensor.status] ?? '#6b7280'
          return (
            <CircleMarker
              key={sensor.id}
              center={[sensor.latitude!, sensor.longitude!]}
              radius={sensor.has_active_alert ? 12 : 9}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.85,
                weight: sensor.has_active_alert ? 2.5 : 1.5,
              }}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-semibold text-gray-900">{sensor.name}</p>
                  <p className="text-gray-600">
                    Metric: {METRIC_LABELS[sensor.metric_type] ?? sensor.metric_type}
                  </p>
                  {sensor.zone_name && (
                    <p className="text-gray-600">Zone: {sensor.zone_name}</p>
                  )}
                  <p className="flex items-center gap-1">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[sensor.status] ?? '#6b7280' }}
                    />
                    <span className="capitalize text-gray-700">{sensor.status}</span>
                  </p>
                  {sensor.has_active_alert && (
                    <p className="text-red-600 font-medium">Active alert</p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
          Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
          Maintenance
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-500 inline-block" />
          Inactive
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
          Active alert
        </span>
      </div>

      {/* Sensors missing coordinates */}
      {sensorsWithoutCoords.length > 0 && (
        <div className="mt-3 border border-yellow-200 bg-yellow-50 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            {sensorsWithoutCoords.length} sensor{sensorsWithoutCoords.length > 1 ? 's' : ''} missing location data
          </p>
          <ul className="space-y-1">
            {sensorsWithoutCoords.map(s => (
              <li key={s.id} className="flex items-center gap-2 text-sm text-yellow-700">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[s.status] ?? '#6b7280' }}
                />
                <span>{s.name}</span>
                <span className="text-yellow-500 text-xs">({METRIC_LABELS[s.metric_type] ?? s.metric_type})</span>
                {s.has_active_alert && (
                  <span className="text-red-600 text-xs font-medium">active alert</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-yellow-600 mt-2">
            Set <code className="bg-yellow-100 px-1 rounded">latitude</code> and{' '}
            <code className="bg-yellow-100 px-1 rounded">longitude</code> on these sensors in the database to show them on the map.
          </p>
        </div>
      )}
    </div>
  )
}

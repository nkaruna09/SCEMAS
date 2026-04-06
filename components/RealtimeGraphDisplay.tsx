'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface DataPoint {
  timestamp: string
  timeDisplay: string
  value: number
  predictedValue?: number
  isPredicted: boolean
  sensor_id: string
  metric_type: string
}

interface GraphState {
  [sensorId: string]: DataPoint[]
}

interface MockSensorConfig {
  sensorId: string
  sensorType: string
  metricType: string
  label: string
  unit: string
  min: number
  max: number
  zone: string
}

// Mock sensor configurations with all metrics
const MOCK_SENSORS: MockSensorConfig[] = [
  {
    sensorId: 'sensor-air-pm25-01',
    sensorType: 'air_quality',
    metricType: 'pm2_5',
    label: 'PM2.5',
    unit: 'µg/m³',
    min: 10,
    max: 100,
    zone: 'zone_downtown',
  },
  {
    sensorId: 'sensor-air-pm10-01',
    sensorType: 'air_quality',
    metricType: 'pm10',
    label: 'PM10',
    unit: 'µg/m³',
    min: 20,
    max: 150,
    zone: 'zone_downtown',
  },
  {
    sensorId: 'sensor-air-co2-01',
    sensorType: 'air_quality',
    metricType: 'co2_ppm',
    label: 'CO₂',
    unit: 'ppm',
    min: 350,
    max: 2000,
    zone: 'zone_north',
  },
  {
    sensorId: 'sensor-weather-temp-01',
    sensorType: 'weather',
    metricType: 'temperature_c',
    label: 'Temperature',
    unit: '°C',
    min: 15,
    max: 35,
    zone: 'zone_north',
  },
  {
    sensorId: 'sensor-weather-humidity-01',
    sensorType: 'weather',
    metricType: 'humidity_pct',
    label: 'Humidity',
    unit: '%',
    min: 20,
    max: 95,
    zone: 'zone_north',
  },
  {
    sensorId: 'sensor-weather-pressure-01',
    sensorType: 'weather',
    metricType: 'pressure_hpa',
    label: 'Pressure',
    unit: 'hPa',
    min: 950,
    max: 1050,
    zone: 'zone_north',
  },
  {
    sensorId: 'sensor-weather-wind-01',
    sensorType: 'weather',
    metricType: 'wind_speed_ms',
    label: 'Wind Speed',
    unit: 'm/s',
    min: 0,
    max: 40,
    zone: 'zone_west',
  },
  {
    sensorId: 'sensor-noise-db-01',
    sensorType: 'noise',
    metricType: 'noise_db',
    label: 'Noise Level',
    unit: 'dB',
    min: 40,
    max: 90,
    zone: 'zone_industrial',
  },
]

export default function RealtimeGraphDisplay() {
  const [graphState, setGraphState] = useState<GraphState>({})
  const [activeSensor, setActiveSensor] = useState(0)
  const dataUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const predictionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  // Generate realistic mock telemetry with trend
  const generateMockTelemetry = useCallback(
    (sensor: MockSensorConfig, baseValue?: number): number => {
      const range = sensor.max - sensor.min
      // Add slight trend and randomness
      let value = baseValue ?? sensor.min + range / 2
      const trend = (Math.sin(Date.now() / 10000) * range) / 4
      const noise = (Math.random() - 0.5) * range * 0.1
      const newValue = Math.max(sensor.min, Math.min(sensor.max, value + trend + noise))
      return Math.round(newValue * 10) / 10
    },
    []
  )

  // Linear regression prediction
  const predictNextValues = useCallback((values: number[], steps: number = 5): number[] => {
    if (values.length < 2) return Array(steps).fill(values[values.length - 1])

    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((acc, v, i) => acc + i * v, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    const predictions: number[] = []
    for (let i = 1; i <= steps; i++) {
      const predicted = intercept + slope * (n + i - 1)
      predictions.push(Math.round(predicted * 10) / 10)
    }
    return predictions
  }, [])

  // Initialize graph with historical data
  const initializeGraphData = useCallback(() => {
    const newGraphState: GraphState = {}

    MOCK_SENSORS.forEach((sensor) => {
      const dataPoints: DataPoint[] = []
      let currentValue = sensor.min + (sensor.max - sensor.min) / 2

      // Generate 20 historical data points
      for (let i = 19; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 5000) // 5 seconds apart
        currentValue = generateMockTelemetry(sensor, currentValue)
        dataPoints.push({
          timestamp: timestamp.toISOString(),
          timeDisplay: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: currentValue,
          isPredicted: false,
          sensor_id: sensor.sensorId,
          metric_type: sensor.metricType,
        })
      }

      // Generate 5 predicted data points
      const values = dataPoints.map((d) => d.value)
      const predictions = predictNextValues(values, 5)

      predictions.forEach((predictedValue, idx) => {
        const timestamp = new Date(Date.now() + (idx + 1) * 5000)
        dataPoints.push({
          timestamp: timestamp.toISOString(),
          timeDisplay: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: predictedValue,
          predictedValue,
          isPredicted: true,
          sensor_id: sensor.sensorId,
          metric_type: sensor.metricType,
        })
      })

      newGraphState[sensor.sensorId] = dataPoints
    })

    setGraphState(newGraphState)
  }, [generateMockTelemetry, predictNextValues])

  // Add new real-time data point
  const addRealtimeDataPoint = useCallback(() => {
    setGraphState((prev) => {
      const updated = { ...prev }

      MOCK_SENSORS.forEach((sensor) => {
        if (!updated[sensor.sensorId]) return

        const dataPoints = [...updated[sensor.sensorId]]
        // Remove oldest point if we have more than 25 points (to keep it manageable)
        if (dataPoints.length > 25) {
          dataPoints.shift()
        }

        const lastRealPoint = dataPoints.find((d) => !d.isPredicted)
        const lastValue = lastRealPoint?.value ?? sensor.min + (sensor.max - sensor.min) / 2

        // Add new real-time data point
        const newValue = generateMockTelemetry(sensor, lastValue)
        const timestamp = new Date()

        dataPoints.push({
          timestamp: timestamp.toISOString(),
          timeDisplay: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: newValue,
          isPredicted: false,
          sensor_id: sensor.sensorId,
          metric_type: sensor.metricType,
        })

        // Regenerate predictions based on new data
        const realPoints = dataPoints.filter((d) => !d.isPredicted)
        const values = realPoints.map((d) => d.value)
        const predictions = predictNextValues(values, 5)

        // Remove old predicted points
        const newDataPoints = dataPoints.filter((d) => !d.isPredicted)

        // Add new predicted points
        predictions.forEach((predictedValue, idx) => {
          const predTimestamp = new Date(Date.now() + (idx + 1) * 5000)
          newDataPoints.push({
            timestamp: predTimestamp.toISOString(),
            timeDisplay: predTimestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            value: predictedValue,
            predictedValue,
            isPredicted: true,
            sensor_id: sensor.sensorId,
            metric_type: sensor.metricType,
          })
        })

        updated[sensor.sensorId] = newDataPoints
      })

      return updated
    })
  }, [generateMockTelemetry, predictNextValues])

  // Initialize on mount
  useEffect(() => {
    initializeGraphData()
  }, [initializeGraphData])

  // Real-time data updates every 5 seconds
  useEffect(() => {
    dataUpdateIntervalRef.current = setInterval(() => {
      addRealtimeDataPoint()
    }, 5000)

    return () => {
      if (dataUpdateIntervalRef.current) {
        clearInterval(dataUpdateIntervalRef.current)
      }
    }
  }, [addRealtimeDataPoint])

  // Setup Supabase real-time subscription for when backend starts sending real data
  useEffect(() => {
    const channel = supabase
      .channel('realtime-telemetry')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_readings',
        },
        (payload) => {
          // This will be used when real telemetry starts coming in
          console.log('New telemetry:', payload.new)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const currentSensor = MOCK_SENSORS[activeSensor]
  const chartData = graphState[currentSensor.sensorId] || []

  return (
    <div className="w-full space-y-4">
      {/* Metric Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">Current Metric</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">
              {currentSensor.label}
              <span className="text-lg text-gray-500 font-normal ml-2">({currentSensor.unit})</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">📍 {currentSensor.zone}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Live Value</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">
              {chartData.length > 0
                ? chartData
                    .filter((d) => !d.isPredicted)
                    .pop()?.value.toFixed(1) || '—'
                : '—'}
              <span className="text-lg text-gray-400 ml-1">{currentSensor.unit}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sensor selector - organized by type */}
      <div className="space-y-3">
        {/* Air Quality */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Air Quality</p>
          <div className="flex gap-2 flex-wrap">
            {MOCK_SENSORS.filter((s) => s.sensorType === 'air_quality').map((sensor, idx) => {
              const globalIdx = MOCK_SENSORS.indexOf(sensor)
              return (
                <button
                  key={sensor.sensorId}
                  onClick={() => setActiveSensor(globalIdx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm ${
                    activeSensor === globalIdx
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg ring-2 ring-blue-300'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {sensor.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Weather */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Weather</p>
          <div className="flex gap-2 flex-wrap">
            {MOCK_SENSORS.filter((s) => s.sensorType === 'weather').map((sensor) => {
              const globalIdx = MOCK_SENSORS.indexOf(sensor)
              return (
                <button
                  key={sensor.sensorId}
                  onClick={() => setActiveSensor(globalIdx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm ${
                    activeSensor === globalIdx
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg ring-2 ring-green-300'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {sensor.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Noise */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Environmental</p>
          <div className="flex gap-2 flex-wrap">
            {MOCK_SENSORS.filter((s) => s.sensorType === 'noise').map((sensor) => {
              const globalIdx = MOCK_SENSORS.indexOf(sensor)
              return (
                <button
                  key={sensor.sensorId}
                  onClick={() => setActiveSensor(globalIdx)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 text-sm ${
                    activeSensor === globalIdx
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg ring-2 ring-orange-300'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {sensor.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl shadow-lg border border-gray-200 h-96 relative">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.1)"
                vertical={false}
              />
              <XAxis
                dataKey="timeDisplay"
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#666"
                domain={['dataMin - 10', 'dataMax + 10']}
                label={{ value: currentSensor.unit, angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0, 0, 0, 0.9)',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '10px',
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'value') {
                    return [
                      `${Number(value).toFixed(1)} ${currentSensor.unit}`,
                      '📊 Real-time Data',
                    ]
                  }
                  return [`${Number(value).toFixed(1)} ${currentSensor.unit}`, '🔮 Predicted']
                }}
                labelStyle={{ color: '#fff', fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: '20px',
                  color: '#666',
                }}
                formatter={(value) => {
                  if (value === 'value') return '📊 Real-time Data'
                  if (value === 'predictedValue') return '🔮 Predicted Data'
                  return value
                }}
              />

              {/* Real-time data line */}
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5, opacity: 0.8 }}
                activeDot={{ r: 7, opacity: 1, filter: 'url(#glow)' }}
                animationDuration={300}
                name="value"
                isAnimationActive={true}
              />

              {/* Predicted data line - more prominent */}
              <Line
                type="monotone"
                dataKey="predictedValue"
                stroke="#ef4444"
                strokeWidth={3.5}
                strokeDasharray="8 4"
                dot={{ fill: '#ef4444', r: 5, opacity: 0.9, stroke: '#dc2626', strokeWidth: 2 }}
                activeDot={{ r: 8, opacity: 1, filter: 'url(#glow)', stroke: '#991b1b', strokeWidth: 2 }}
                animationDuration={300}
                name="predictedValue"
                isAnimationActive={true}
              />

              {/* Vertical separator between real and predicted */}
              {chartData.some((d) => d.isPredicted) && (
                <ReferenceLine
                  x={chartData.find((d) => d.isPredicted)?.timeDisplay}
                  stroke="#dc2626"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: '→ Predictions Start Here',
                    position: 'insideBottomRight',
                    offset: -5,
                    fill: '#dc2626',
                    fontSize: 12,
                    fontWeight: 'bold',
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-lg">Loading telemetry data...</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-600 font-semibold">📊 Current Value</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            {chartData.length > 0
              ? chartData
                  .filter((d) => !d.isPredicted)
                  .pop()?.value.toFixed(1) || 'N/A'
              : 'N/A'}
            <span className="text-sm text-blue-600 ml-1">{currentSensor.unit}</span>
          </p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-xs text-red-600 font-semibold">🔮 Next Prediction</p>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {chartData.length > 0
              ? chartData
                  .filter((d) => d.isPredicted)
                  .at(0)?.predictedValue?.toFixed(1) || 'N/A'
              : 'N/A'}
            <span className="text-sm text-red-600 ml-1">{currentSensor.unit}</span>
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-xs text-green-600 font-semibold">📉 Min Value</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {chartData.length > 0
              ? Math.min(
                  ...chartData
                    .filter((d) => !d.isPredicted)
                    .map((d) => d.value)
                ).toFixed(1)
              : 'N/A'}
            <span className="text-sm text-green-600 ml-1">{currentSensor.unit}</span>
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-xs text-orange-600 font-semibold">📈 Max Value</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">
            {chartData.length > 0
              ? Math.max(
                  ...chartData
                    .filter((d) => !d.isPredicted)
                    .map((d) => d.value)
                ).toFixed(1)
              : 'N/A'}
            <span className="text-sm text-orange-600 ml-1">{currentSensor.unit}</span>
          </p>
        </div>
      </div>

      {/* Legend info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
            <span className="font-semibold text-gray-800">📊 Real-time Data</span>
          </div>
          <p className="text-xs text-gray-600">Actual measurements from sensors, updated every 5 seconds</p>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 bg-red-500 rounded-full" style={{ borderTop: '2px dashed #ef4444' }}></div>
            <span className="font-semibold text-gray-800">🔮 Predicted Data</span>
          </div>
          <p className="text-xs text-gray-600">Forecast based on linear regression trend analysis (red dashed line)</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-purple-600 text-lg">⚡</span>
            <span className="font-semibold text-gray-800">Auto-Refresh</span>
          </div>
          <p className="text-xs text-gray-600">Data updates automatically. No manual refresh needed</p>
        </div>
      </div>
    </div>
  )
}

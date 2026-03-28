'use client'

import { useEffect, useState } from 'react'

function GraphDisplay() {
  const [graphUrls, setGraphUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchGraphs(controller.signal)

    return () => {
      controller.abort()

      // ✅ cleanup blob URLs to avoid memory leaks
      graphUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const fetchGraphs = async (signal: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)

      const sensors = ['sensor1', 'sensor2', 'sensor3']

      const graphPromises = sensors.map(async (sensorId) => {
        try {
          const response = await fetch(
            'http://localhost:8000/generate-graph/',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sensor_id: sensorId,
                data: [
                  { x: 1, y: Math.random() * 100 },
                  { x: 2, y: Math.random() * 100 },
                  { x: 3, y: Math.random() * 100 },
                ],
              }),
              signal,
            }
          )

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const blob = await response.blob()

          // ✅ ensure it's actually an image
          if (!blob.type.includes('image')) {
            throw new Error('Response is not an image')
          }

          return URL.createObjectURL(blob)
        } catch (err) {
          console.error(`❌ Graph fetch failed for ${sensorId}:`, err)
          return null
        }
      })

      const results = await Promise.all(graphPromises)

      const validUrls = results.filter((url): url is string => !!url)

      if (validUrls.length === 0) {
        throw new Error('No graphs returned from backend')
      }

      setGraphUrls(validUrls)
    } catch (err: any) {
      console.error('❌ Error fetching graphs:', err)

      // ✅ helpful user-facing error
      setError(
        'Unable to load graphs. Make sure backend is running on http://127.0.0.1:8000 and CORS is enabled.'
      )
    } finally {
      setLoading(false)
    }
  }

  // ---------------- UI ----------------

  if (loading) {
    return <p className="text-gray-500">Loading graphs...</p>
  }

  if (error) {
    return (
      <div className="text-center text-red-500 space-y-2">
        <p>{error}</p>
        <button
          onClick={() => fetchGraphs(new AbortController().signal)}
          className="px-3 py-1 bg-red-100 text-red-600 rounded-md hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    )
  }

  if (graphUrls.length === 0) {
    return <p className="text-gray-500">No graphs available.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {graphUrls.map((url, index) => (
        <img
          key={index}
          src={url}
          alt={`Graph ${index + 1}`}
          className="rounded-lg shadow-md border"
        />
      ))}
    </div>
  )
}

export default GraphDisplay
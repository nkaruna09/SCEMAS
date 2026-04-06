export default function ApiDocsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 font-mono text-sm">
      <h1 className="text-2xl font-bold mb-1 font-sans">SCEMAS Public API</h1>
      <p className="text-gray-500 mb-8 font-sans text-sm">
        Read-only. No authentication required. Rate limited to 60 requests/min per IP.
      </p>

      {/* Zones */}
      <section className="mb-10">
        <h2 className="text-base font-bold mb-3 font-sans border-b pb-1">Zones</h2>
        <div className="bg-gray-100 rounded p-3 mb-2">
          <span className="text-green-700 font-bold">GET</span>{' '}
          <span>/api/public/zones</span>
        </div>
        <p className="text-gray-600 mb-3 font-sans">Returns all city zones with optional GeoJSON boundary.</p>
        <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-xs">{`{
  "zones": [
    { "id": "uuid", "name": "Zone A", "geojson_boundary": null }
  ]
}`}</pre>
      </section>

      {/* Sensors */}
      <section className="mb-10">
        <h2 className="text-base font-bold mb-3 font-sans border-b pb-1">Sensors</h2>
        <div className="bg-gray-100 rounded p-3 mb-2">
          <span className="text-green-700 font-bold">GET</span>{' '}
          <span>/api/public/sensors</span>
        </div>
        <p className="text-gray-600 mb-3 font-sans">Returns approved, active sensors. Only approved sensors are exposed.</p>
        <table className="w-full text-xs mb-3 font-sans">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1 pr-4">Param</th>
              <th className="py-1 pr-4">Type</th>
              <th className="py-1">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="py-1 pr-4">zone_id</td><td className="pr-4">string</td><td>Filter by zone UUID</td></tr>
            <tr><td className="py-1 pr-4">metric_type</td><td className="pr-4">string</td><td>e.g. temperature, humidity</td></tr>
          </tbody>
        </table>
        <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-xs">{`{
  "sensors": [
    { "id": "uuid", "name": "Sensor 1", "zone_id": "uuid", "metric_type": "temperature", "status": "active" }
  ]
}`}</pre>
      </section>

      {/* Telemetry */}
      <section className="mb-10">
        <h2 className="text-base font-bold mb-3 font-sans border-b pb-1">Telemetry</h2>
        <div className="bg-gray-100 rounded p-3 mb-2">
          <span className="text-green-700 font-bold">GET</span>{' '}
          <span>/api/public/telemetry</span>
        </div>
        <p className="text-gray-600 mb-3 font-sans">Returns recent sensor readings. Default 100, max 500.</p>
        <table className="w-full text-xs mb-3 font-sans">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1 pr-4">Param</th>
              <th className="py-1 pr-4">Type</th>
              <th className="py-1">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="py-1 pr-4">sensor_id</td><td className="pr-4">string</td><td>Filter by sensor UUID</td></tr>
            <tr className="border-b"><td className="py-1 pr-4">zone_id</td><td className="pr-4">string</td><td>Filter by zone UUID</td></tr>
            <tr className="border-b"><td className="py-1 pr-4">metric_type</td><td className="pr-4">string</td><td>e.g. temperature</td></tr>
            <tr><td className="py-1 pr-4">limit</td><td className="pr-4">number</td><td>Max results (default 100, max 500)</td></tr>
          </tbody>
        </table>
        <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-xs">{`{
  "readings": [
    { "id": "uuid", "sensor_id": "uuid", "zone_id": "uuid", "metric_type": "temperature", "value": 22.5, "timestamp": "..." }
  ],
  "count": 1
}`}</pre>
      </section>

      {/* Alerts */}
      <section className="mb-10">
        <h2 className="text-base font-bold mb-3 font-sans border-b pb-1">Alerts</h2>
        <div className="bg-gray-100 rounded p-3 mb-2">
          <span className="text-green-700 font-bold">GET</span>{' '}
          <span>/api/public/alerts</span>
        </div>
        <p className="text-gray-600 mb-3 font-sans">Returns alerts with joined rule info. Defaults to active alerts.</p>
        <table className="w-full text-xs mb-3 font-sans">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-1 pr-4">Param</th>
              <th className="py-1 pr-4">Type</th>
              <th className="py-1">Description</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b"><td className="py-1 pr-4">status</td><td className="pr-4">string</td><td>active (default), acknowledged, resolved</td></tr>
            <tr><td className="py-1 pr-4">severity</td><td className="pr-4">string</td><td>low, medium, high, critical</td></tr>
          </tbody>
        </table>
        <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto text-xs">{`{
  "alerts": [
    {
      "id": "uuid",
      "sensor_id": "uuid",
      "value": 99.1,
      "status": "active",
      "triggered_at": "...",
      "alert_rules": { "metric_type": "temperature", "threshold_value": 80, "operator": ">", "severity": "high" }
    }
  ],
  "count": 1
}`}</pre>
      </section>

      {/* Rate limiting */}
      <section className="mb-10">
        <h2 className="text-base font-bold mb-3 font-sans border-b pb-1">Rate limiting</h2>
        <p className="text-gray-600 font-sans">
          All endpoints are limited to <strong>60 requests per minute</strong> per IP address.
          Exceeding this returns <code className="bg-gray-100 px-1 rounded">429 Too Many Requests</code>.
        </p>
      </section>

      <p className="text-gray-400 font-sans text-xs">Base URL: <code>http://localhost:3000</code> (development)</p>
    </main>
  )
}

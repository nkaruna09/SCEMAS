# SCEMAS

Smart City Environmental Monitoring and Alert System — McMaster SE 3A04, Group T01-G3.

Front-end: Next.js 
Back-end: Supabase, FastAPI

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once ready, go to **Settings → API** and copy your Project URL, publishable key, and service role key

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Settings → API → Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role key (reveal it) |
| `SENSOR_API_KEY` | Generate with `openssl rand -base64 32` |

### 4. Initialize the database

In your Supabase project, go to **SQL Editor** and run the entire contents of `supabase/schema.sql`.

### 5. Disable email confirmation (development)

In Supabase: **Authentication → Providers → Email** → turn off **Confirm email**.

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up — you'll be assigned `system_admin` automatically.

## Roles

| Role | Dashboard path |
|---|---|
| City Operator | `/city-operator` |
| System Admin | `/system-admin` |
| Government Official | `/government` |
| Emergency Services | `/emergency` |

To change a user's role, update their row in the `user_roles` table via the Supabase Table Editor.

## Running the backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload
```

Runs at `http://localhost:8000`

## Trend / anomaly alerts

In addition to rule-based alerts, the system automatically detects anomalous sensor behaviour. A **trend alert** is created when a sensor reports 5 consecutive readings moving in the same direction, or a sudden spike (>2.5 std deviations from recent baseline). These appear with a purple **trend** badge on the alerts page and have no associated threshold rule.

To trigger one, send 6 steadily increasing readings for the same sensor (replace `your-sensor-id`):
```powershell
$headers = @{ "x-api-key" = "your-api-key"; "Content-Type" = "application/json" }
1..6 | ForEach-Object {
  $body = @{ sensor_id = "your-sensor-id"; zone_id = "your-zone-id"; metric_type = "temperature"; value = (50 + $_) } | ConvertTo-Json
  Invoke-WebRequest -Uri http://localhost:3000/api/ingest -Method POST -Headers $headers -Body $body
  Start-Sleep -Milliseconds 300
}
```
A trend alert should appear on the Alerts page within a few seconds.

## Predictive alerts

The system uses linear regression on the last 10 readings to forecast future values. If the projected value (5 steps ahead) would cross an existing alert rule threshold, an orange **predicted** alert is created before the threshold is actually reached.

To test, send readings that approach but don't cross a threshold (adjust values to stay below your rule's threshold):
```powershell
@(100, 110, 115, 120, 125, 130, 135, 140, 143, 146) | ForEach-Object {
  $body = "{`"sensor_id`": `"$sensorId`", `"zone_id`": `"$zoneId`", `"metric_type`": `"air_quality`", `"value`": $_}"
  Invoke-WebRequest -Uri http://localhost:3000/api/ingest `
    -Method POST -UseBasicParsing `
    -Headers @{"x-api-key" = $apiKey} `
    -ContentType "application/json" `
    -Body $body | Select-Object StatusCode
  Start-Sleep -Milliseconds 300
}
```
An orange **predicted** badge should appear on the Alerts page. The threshold column will show what rule would be violated.

## Webhook notifications

External systems can subscribe to receive a POST request whenever a new alert is triggered.

```
POST /api/webhooks          # register a URL
GET  /api/webhooks          # list subscriptions
DELETE /api/webhooks/:id    # remove a subscription
PATCH  /api/webhooks/:id    # pause/resume (body: {"active": false})
```

Example registration:
```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-system.com/alert-handler", "secret": "optional-signing-secret"}'
```

When an alert fires, each registered URL receives:
```json
{
  "event": "alert.triggered",
  "timestamp": "...",
  "alerts": [{ "id": "...", "sensor_id": "...", "value": 999, "severity": "high", "metric_type": "temperature" }]
}
```

If a `secret` was provided, the request includes an `X-SCEMAS-Signature` header (HMAC-SHA256) for verification.

## Running the telemetry simulator

Generates fake sensor readings and sends them to the backend. Run this after the backend is up.

```bash
cd backend
python simulate_sensors.py
```

## Other commands

```bash
npm run build      # Production build
npm run lint       # ESLint
npx tsc --noEmit   # Type-check
```

## Public signage display

A public kiosk view showing live alerts and sensor readings. No login required.

```
http://localhost:3000/signage
```

Refreshes automatically every 30 seconds.

---

## Public API

No authentication required. Base URL: `http://localhost:3000`

### Zones
```
GET /api/public/zones
```

### Sensors
```
GET /api/public/sensors
GET /api/public/sensors?zone_id=<id>
GET /api/public/sensors?metric_type=temperature
```

### Telemetry readings
```
GET /api/public/telemetry
GET /api/public/telemetry?sensor_id=<id>
GET /api/public/telemetry?zone_id=<id>&metric_type=temperature
GET /api/public/telemetry?limit=50
```

Max limit: 500. Default: 100.

### Alerts
```
GET /api/public/alerts
GET /api/public/alerts?status=active
GET /api/public/alerts?status=resolved&severity=critical
```

Valid `status`: `active`, `acknowledged`, `resolved`
Valid `severity`: `low`, `medium`, `high`, `critical`

### Testing rate limiting

The public API is limited to 60 requests per minute per IP. To test it, run this in PowerShell while the dev server is running:

```powershell
1..65 | ForEach-Object {
  try {
    $r = Invoke-WebRequest -Uri http://localhost:3000/api/public/zones -UseBasicParsing -TimeoutSec 5
    Write-Host "Request $_`: $($r.StatusCode)"
  } catch {
    Write-Host "Request $_`: $($_.Exception.Response.StatusCode.value__)"
  }
}
```

Requests 1–60 return `200`. Requests 61–65 return `429 Too Many Requests`. The window resets after 60 seconds.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { dispatchWebhooks } from '@/lib/webhook-dispatcher'
import { runTrendDetection } from '@/lib/trend-detector'
import { runPrediction } from '@/lib/predictor'

// Service-role client — bypasses RLS for trusted sensor writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

interface IngestPayload {
  sensor_id: string
  zone_id: string
  metric_type: string
  value: number
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.SENSOR_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: IngestPayload
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { sensor_id, zone_id, metric_type, value } = body
  if (!sensor_id || !zone_id || !metric_type || value === undefined) {
    return NextResponse.json({ error: 'Missing required fields: sensor_id, zone_id, metric_type, value' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('telemetry_readings')
    .insert({ sensor_id, zone_id, metric_type, value })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  //run trend/anomaly detection and predictive forecasting fire-and-forget
  runTrendDetection(sensor_id, metric_type, value).catch(console.error)
  runPrediction(sensor_id, metric_type).catch(console.error)

  // Query alerts created by the DB trigger for this sensor in the last 2 seconds
  const since = new Date(Date.now() - 2000).toISOString()
  const { data: newAlerts } = await supabaseAdmin
    .from('alerts')
    .select('id, sensor_id, rule_id, value, status, triggered_at, alert_rules (severity, metric_type)')
    .eq('sensor_id', sensor_id)
    .eq('status', 'active')
    .gte('triggered_at', since)

  if (newAlerts && newAlerts.length > 0) {
    const payload = newAlerts.map((a) => ({
      id: a.id,
      sensor_id: a.sensor_id,
      rule_id: a.rule_id,
      value: a.value,
      status: a.status,
      triggered_at: a.triggered_at,
      severity: (a.alert_rules as { severity?: string } | null)?.severity,
      metric_type: (a.alert_rules as { metric_type?: string } | null)?.metric_type,
    }))

    dispatchWebhooks(payload).catch(console.error)
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

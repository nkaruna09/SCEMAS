import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

  return NextResponse.json({ ok: true }, { status: 201 })
}

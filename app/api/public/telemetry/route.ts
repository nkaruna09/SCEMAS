import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role so unauthenticated callers can still read data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

//cap results so public callers cant dump the whole table
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 100

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sensor_id = searchParams.get('sensor_id')
  const zone_id = searchParams.get('zone_id')
  const metric_type = searchParams.get('metric_type')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT)), MAX_LIMIT)

  let query = supabaseAdmin
    .from('telemetry_readings')
    .select('id, sensor_id, zone_id, metric_type, value, timestamp')
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (sensor_id) query = query.eq('sensor_id', sensor_id)
  if (zone_id) query = query.eq('zone_id', zone_id)
  if (metric_type) query = query.eq('metric_type', metric_type)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ readings: data, count: data?.length ?? 0 })
}

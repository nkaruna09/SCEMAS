import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role so unauthenticated callers can still read data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'active'
  const severity = searchParams.get('severity')

  //join rule so callers get metric/severity info without a second request
  let query = supabaseAdmin
    .from('alerts')
    .select(`
      id,
      sensor_id,
      value,
      status,
      triggered_at,
      resolved_at,
      alert_rules (metric_type, threshold_value, operator, severity)
    `)
    .order('triggered_at', { ascending: false })
    .limit(100)

  const validStatuses = ['active', 'acknowledged', 'resolved']
  if (validStatuses.includes(status)) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  //filter by severity after join since its on the rule not the alert row
  const filtered = severity
    ? (data ?? []).filter((a) => (a.alert_rules as { severity?: string } | null)?.severity === severity)
    : data

  return NextResponse.json({ alerts: filtered, count: filtered?.length ?? 0 })
}

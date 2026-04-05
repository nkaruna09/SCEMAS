import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/lib/rate-limit'

//service role so unauthenticated callers can still read data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const zone_id = searchParams.get('zone_id')
  const metric_type = searchParams.get('metric_type')

  //only expose approved, active sensors
  let query = supabaseAdmin
    .from('sensors')
    .select('id, name, zone_id, metric_type, status')
    .eq('approved', true)
    .eq('status', 'active')

  if (zone_id) query = query.eq('zone_id', zone_id)
  if (metric_type) query = query.eq('metric_type', metric_type)

  const { data, error } = await query.order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sensors: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role so RLS doesn't block server-side writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)
export async function POST(request: NextRequest) {
  let body: { metric_type: string; threshold_value: number; operator: string; severity: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const { metric_type, threshold_value, operator, severity } = body
  if (!metric_type || threshold_value === undefined || !operator || !severity) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('alert_rules')
    .insert({ metric_type, threshold_value, operator, severity })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

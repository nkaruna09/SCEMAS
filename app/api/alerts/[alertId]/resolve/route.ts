import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  const { alertId } = await params

  const { error } = await supabaseAdmin
    .from('alerts')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .in('status', ['active', 'acknowledged'])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, alert_id: alertId, status: 'resolved' })
}

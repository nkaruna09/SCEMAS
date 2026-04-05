import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role so unauthenticated callers can still read data
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('zones')
    .select('id, name, geojson_boundary')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ zones: data })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Called server-side after signup to assign a default role.
// Uses service role key to bypass RLS.
export async function POST(request: NextRequest) {
  const { user_id } = await request.json()
  if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id, role: 'system_admin' })

  if (error && error.code !== '23505') { // ignore duplicate
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role needed to modify user_roles and delete auth users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  let body: { role: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }
  const validRoles = ['city_operator', 'system_admin', 'government_official', 'emergency_services']
  if (!validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'invalid role' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .update({ role: body.role })
    .eq('user_id', userId)
    .select()
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params
  //remove role assignment first
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }
  //delete the auth user too so they cant log back in
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }
  return NextResponse.json({ success: true, user_id: userId })
}

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

//service role needed to read auth.users through admin api
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(request: NextRequest) {
  let body: { email: string; password: string; role: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const validRoles = ['city_operator', 'system_admin', 'government_official', 'emergency_services']
  if (!body.email || !body.password || !validRoles.includes(body.role)) {
    return NextResponse.json({ error: 'missing or invalid fields' }, { status: 400 })
  }

  //create the auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: body.email,
    password: body.password,
    email_confirm: true,
  })
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  //assign their role
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .insert({ user_id: authData.user.id, role: body.role })

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }
  return NextResponse.json({
    id: authData.user.id,
    username: body.email,
    role: body.role,
    status: 'Active',
  }, { status: 201 })
}

export async function GET() {
  //get all role assignments
  const { data: roleRows, error: roleError } = await supabaseAdmin
    .from('user_roles')
    .select('user_id, role')

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  //get auth user emails so we can show something useful as a username
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }
  const emailMap = new Map(authData.users.map((u) => [u.id, u.email ?? u.id]))
  const users = (roleRows ?? []).map((row) => ({
    id: row.user_id,
    username: emailMap.get(row.user_id) ?? row.user_id,
    role: row.role,
    status: 'Active',
  }))
  return NextResponse.json(users)
}

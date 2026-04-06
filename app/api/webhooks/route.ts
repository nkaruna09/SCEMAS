import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('id, url, active, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ webhooks: data })
}

export async function POST(request: NextRequest) {
  let body: { url: string; secret?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  //basic url validation
  try { new URL(body.url) } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .insert({ url: body.url, secret: body.secret ?? null })
    .select('id, url, active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

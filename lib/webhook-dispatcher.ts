import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type AlertPayload = {
  id: string
  sensor_id: string
  rule_id: string
  value: number
  status: string
  triggered_at: string
  severity?: string
  metric_type?: string
}

async function sign(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function dispatchWebhooks(alerts: AlertPayload[]) {
  if (alerts.length === 0) return

  const { data: subs, error } = await supabaseAdmin
    .from('webhook_subscriptions')
    .select('id, url, secret')
    .eq('active', true)

  if (error || !subs || subs.length === 0) return

  const payload = JSON.stringify({ event: 'alert.triggered', alerts, timestamp: new Date().toISOString() })

  await Promise.allSettled(
    subs.map(async (sub) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (sub.secret) {
        headers['X-SCEMAS-Signature'] = await sign(sub.secret, payload)
      }

      await fetch(sub.url, { method: 'POST', headers, body: payload })
    })
  )
}

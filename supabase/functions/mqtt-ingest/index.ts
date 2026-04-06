import { serve } from 'https://deno.land/std/http/server.ts'

//hivemq sends post with this frmat
interface HiveMQWebhookPayload {
  topic: string
  payload: string //base64 mqtt msgbody
  timestamp?: string
}

//ingest route expect
interface IngestPayload {
  sensor_id: string
  zone_id: string
  metric_type: string
  value: number
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }
  //verify secret
  const secret = req.headers.get('x-hivemq-secret')
  if (!secret || secret !== Deno.env.get('HIVEMQ_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: HiveMQWebhookPayload
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  //decode payload to string, parse as json
  let ingestPayload: IngestPayload
  try {
    const decoded = atob(body.payload)
    ingestPayload = JSON.parse(decoded)
  } catch {
    return new Response('Invalid MQTT payload — must be base64-encoded JSON', { status: 400 })
  }

  const { sensor_id, zone_id, metric_type, value } = ingestPayload
  if (!sensor_id || !zone_id || !metric_type || value === undefined) {
    return new Response('Missing required fields: sensor_id, zone_id, metric_type, value', { status: 400 })
  }

  //fwd to nextjs ingestion
  const ingestUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') + '/api/ingest'
  const response = await fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('SENSOR_API_KEY') ?? '',
    },
    body: JSON.stringify({ sensor_id, zone_id, metric_type, value }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`ingest failed: ${response.status} ${text}`)
    return new Response('Ingest failed', { status: 502 })
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  })
})

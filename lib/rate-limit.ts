import { NextRequest, NextResponse } from 'next/server'

const LIMIT = 60
const WINDOW_MS = 60_000

//module mapstays across requests/api routes
const store = new Map<string, { count: number; resetAt: number }>()

export function getIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

//ret 429 if rate limited/ null if ok
export function checkRateLimit(request: NextRequest): NextResponse | null {
  const ip = getIp(request)
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return null
  }

  if (entry.count >= LIMIT) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'too many requests', retry_after_seconds: retryAfter },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(LIMIT),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
        },
      }
    )
  }

  entry.count++
  return null
}

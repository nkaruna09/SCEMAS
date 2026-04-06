import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_ROUTES, type Role } from '@/lib/types/roles'

const MFA_ROLES = new Set(['city_operator', 'system_admin'])

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Public routes — no auth required
  if (pathname.startsWith('/api/public')) return response
  if (pathname.startsWith('/api/ingest')) return response
  if (pathname.startsWith('/api/webhooks')) return response
  if (pathname.startsWith('/signage')) return response
  if (pathname.startsWith('/docs')) return response

  // Unauthenticated user hitting a protected route → login
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/pending')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user) {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = roleRow?.role as Role | undefined

    // Authenticated user hitting /login → redirect to their dashboard
    if (pathname.startsWith('/login')) {
      const dest = role ? ROLE_ROUTES[role] : '/'
      return NextResponse.redirect(new URL(dest, request.url))
    }

    // Enforce MFA for operators and admins on page routes
    if (
      role &&
      MFA_ROLES.has(role) &&
      !pathname.startsWith('/mfa/') &&
      !pathname.startsWith('/api/')
    ) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

      if (aal) {
        if (aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          // MFA enrolled but not verified this session
          return NextResponse.redirect(new URL('/mfa/challenge', request.url))
        }
        if (aal.nextLevel !== 'aal2') {
          // MFA not enrolled yet
          return NextResponse.redirect(new URL('/mfa/enroll', request.url))
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

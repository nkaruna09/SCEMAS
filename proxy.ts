import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROLE_ROUTES, type Role } from '@/lib/types/roles'

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

  // Public API and signage display — no auth required
  if (pathname.startsWith('/api/public')) return response
  if (pathname.startsWith('/signage')) return response

  // Unauthenticated user hitting a protected route → login
  if (!user && !pathname.startsWith('/login') && !pathname.startsWith('/pending')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting /login → redirect to their dashboard
  if (user && pathname.startsWith('/login')) {
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const dest = roleRow ? ROLE_ROUTES[roleRow.role as Role] : '/'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

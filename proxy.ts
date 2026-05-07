import { type NextRequest, NextResponse } from 'next/server'
import { type CookieOptions, createServerClient } from '@supabase/ssr'

function generateNonce(): string {
  const bytes = new Uint8Array(16)
  globalThis.crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

export async function proxy(request: NextRequest) {
  const nonce = generateNonce()
  const isDev = process.env.NODE_ENV === 'development'

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co",
    "font-src 'self'",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' http://localhost:*' : ''}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    'upgrade-insecure-requests',
  ].join('; ')

  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') === 'http'
  ) {
    const url = request.nextUrl.clone()
    url.protocol = 'https:'
    return NextResponse.redirect(url, { status: 301 })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')
  const isApiRoute = pathname.startsWith('/api')
  const isOnboardingRoute = pathname.startsWith('/onboarding')
  const isAdminRoute = pathname.startsWith('/admin')
  const isReferentRoute = pathname.startsWith('/referent')
  const isLegalRoute = pathname.startsWith('/legal')

  if (!user && !isAuthRoute && !isApiRoute && !isLegalRoute) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && isAuthRoute && !pathname.startsWith('/auth/mfa')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect authenticated users who haven't completed onboarding
  // Cookie `ob_done` is set by the onboarding server action after successful submission.
  if (
    user &&
    !isAuthRoute &&
    !isApiRoute &&
    !isOnboardingRoute &&
    !isLegalRoute &&
    !request.cookies.get('ob_done')
  ) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Role-based route protection (uses app_metadata from getUser() — always fresh)
  if (user) {
    const userRole = (user.app_metadata?.role ?? 'member') as string

    // /admin/* requires admin_local, admin_national, or support
    if (isAdminRoute && !['admin_local', 'admin_national', 'support'].includes(userRole)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // /referent/* requires referent, admin_local, admin_national, or support
    if (
      isReferentRoute &&
      !['referent', 'admin_local', 'admin_national', 'support'].includes(userRole)
    ) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  supabaseResponse.headers.set('Content-Security-Policy', csp)
  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

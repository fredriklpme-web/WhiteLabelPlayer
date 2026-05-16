import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bara skydda app-routes
  const isAppRoute = pathname.startsWith('/library') ||
    pathname.startsWith('/tracks') ||
    pathname.startsWith('/playlists') ||
    pathname.startsWith('/albums') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/upload')

  const isAuthRoute = pathname.startsWith('/login')

  // Låt landningssida och allt annat gå igenom direkt
  if (!isAppRoute && !isAuthRoute) {
    return NextResponse.next({ request })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && isAppRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && isAuthRoute) {
      return NextResponse.redirect(new URL('/library', request.url))
    }
  } catch (e) {
    return NextResponse.next({ request })
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/library/:path*', '/tracks/:path*', '/playlists/:path*', '/albums/:path*', '/settings/:path*', '/upload/:path*', '/login/:path*', '/login'],
}

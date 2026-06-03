import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  // 비로그인 → /login?redirect=원래경로
  if (!session) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // /admin → role이 admin 또는 superadmin 아니면 /403
  if (pathname.startsWith('/admin')) {
    const role = session.user.app_metadata?.role as string | undefined
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/403', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/mypage/:path*', '/admin/:path*'],
}

import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname, host } = req.nextUrl

  // www → non-www 리다이렉트
  if (host.startsWith('www.')) {
    const url = req.nextUrl.clone()
    url.host = host.replace(/^www\./, '')
    return NextResponse.redirect(url, { status: 301 })
  }

  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  // ── /admin/* 보호 ─────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      // 이미 로그인된 경우 대시보드로 이동
      if (session) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
      return res
    }
    // 세션 없으면 admin 로그인 페이지로 이동
    if (!session) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    // 세션 있으면 통과 – role 확인은 각 페이지에서 수행
    return res
  }

  // ── /mypage/* 보호 ─────────────────────────────────────────
  // 세션 없으면 로그인으로 리다이렉트, role은 확인하지 않음
  if (!session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/mypage', '/mypage/:path*', '/admin/:path*'],
}

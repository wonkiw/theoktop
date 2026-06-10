import { createServerClient } from '@supabase/auth-helpers-nextjs'
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

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // ── /admin/* 보호 ────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      // 이미 로그인한 경우 대시보드로 이동 (역할 확인은 클라이언트에서 처리)
      if (session) {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url))
      }
      return res
    }

    // 비로그인 → 권한 없음 페이지
    if (!session) {
      return NextResponse.redirect(new URL('/403', req.url))
    }

    // 세션이 있으면 통과 – 역할 확인은 admin/dashboard 등 클라이언트 측에서 수행
    return res
  }

  // ── /mypage/* 보호 ───────────────────────────────────────────
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

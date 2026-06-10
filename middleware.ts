import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function fetchAdminRole(origin: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(new URL('/api/admin/auth/check-role', origin), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    const json = await res.json()
    return (json.role as string) ?? null
  } catch {
    return null
  }
}

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
    // 관리자 로그인 페이지
    if (pathname === '/admin/login') {
      // 이미 로그인된 관리자는 대시보드로 이동
      if (session) {
        const role = await fetchAdminRole(req.nextUrl.origin, session.access_token)
        if (role === 'admin' || role === 'superadmin') {
          return NextResponse.redirect(new URL('/admin/dashboard', req.url))
        }
      }
      return res
    }

    // 비로그인 → 권한 없음 페이지 (관리자 전용 경로이므로 일반 login으로 보내지 않음)
    if (!session) {
      return NextResponse.redirect(new URL('/403', req.url))
    }

    // RDS에서 역할 확인
    const role = await fetchAdminRole(req.nextUrl.origin, session.access_token)

    // user 또는 역할 확인 실패 → 403
    if (!role || (role !== 'admin' && role !== 'superadmin')) {
      return NextResponse.redirect(new URL('/403', req.url))
    }

    // /admin/accounts → superadmin 전용
    if (pathname.startsWith('/admin/accounts') && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }

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

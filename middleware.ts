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
  const { pathname } = req.nextUrl

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
    // 로그인 페이지는 누구나 접근 가능
    if (pathname === '/admin/login') return res

    // 비로그인 → 관리자 로그인으로 리다이렉트
    if (!session) {
      const url = req.nextUrl.clone()
      url.pathname = '/admin/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
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

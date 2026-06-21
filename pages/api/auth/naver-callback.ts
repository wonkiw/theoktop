import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect('/login?error=naver_denied')
  }

  if (!code) {
    return res.redirect('/login?error=no_code')
  }

  try {
    const clientId = process.env.NAVER_CLIENT_ID!
    const clientSecret = process.env.NAVER_CLIENT_SECRET!
    const redirectUri = process.env.NAVER_REDIRECT_URI ||
      'https://theoktop.com/api/auth/naver-callback'

    // 1. 네이버 토큰 발급
    const tokenRes = await fetch(
      'https://nid.naver.com/oauth2.0/token?' +
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code),
        state: String(state),
      }).toString()
    )
    const tokenData = await tokenRes.json() as { access_token?: string }

    if (!tokenData.access_token) {
      console.error('Naver token error:', tokenData)
      return res.redirect('/login?error=token_failed')
    }

    // 2. 네이버 사용자 정보
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json() as {
      response?: { email?: string; name?: string; id?: string }
    }
    const naverUser = userData.response

    if (!naverUser?.email) {
      return res.redirect('/login?error=no_email')
    }

    // 3. Supabase에 유저 생성 또는 기존 유저 조회
    const supabaseAdmin = getSupabaseAdmin()

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    })

    type SupabaseUser = { id: string; email?: string }
    const users = (listData?.users ?? []) as SupabaseUser[]
    const existingUser = users.find(u => u.email === naverUser.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email: naverUser.email,
          email_confirm: true,
          user_metadata: {
            full_name: naverUser.name || '',
            provider: 'naver',
          },
        })
      if (createErr || !newUser.user) {
        console.error('Create user error:', createErr)
        return res.redirect('/login?error=create_failed')
      }
      userId = newUser.user.id
    }

    // 4. RDS users 테이블에 저장
    const pool = getPool()

    const { rows: emailRows } = await pool.query(
      'SELECT id, status FROM users WHERE email = $1',
      [naverUser.email]
    )

    if (emailRows.length === 0) {
      // 신규 회원
      await pool.query(
        `INSERT INTO users (supabase_uid, email, name, role, provider)
         VALUES ($1, $2, $3, 'user', 'naver')
         ON CONFLICT (supabase_uid) DO UPDATE
         SET email = EXCLUDED.email`,
        [userId, naverUser.email, naverUser.name || '']
      )
    } else if (emailRows[0].status === 'withdrawn') {
      // 탈퇴 회원: RDS는 건드리지 않는다. 매직링크로 세션만 발급하고,
      // /api/auth/callback이 이메일=withdrawn 상태를 감지해 /register?from=rejoin으로 보낸다.
    } else {
      // 기존 active 회원 → supabase_uid 동기화
      await pool.query(
        `UPDATE users SET supabase_uid = $1 WHERE email = $2`,
        [userId, naverUser.email]
      )
    }

    // 5. 매직링크로 자동 로그인
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ||
      'https://theoktop.com'
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: naverUser.email,
        options: {
          redirectTo: `${siteUrl}/api/auth/callback`,
        },
      })

    if (linkErr || !linkData?.properties?.action_link) {
      console.error('Magic link error:', linkErr)
      return res.redirect('/login?error=login_failed')
    }

    return res.redirect(linkData.properties.action_link)
  } catch (err) {
    console.error('Naver callback error:', err)
    return res.redirect('/login?error=server_error')
  }
}

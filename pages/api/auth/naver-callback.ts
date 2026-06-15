import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'
import { getSupabaseAdmin } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const redirectUri =
      process.env.NAVER_REDIRECT_URI || 'https://theoktop.com/api/auth/naver-callback'

    // 1. 네이버 토큰 발급
    const tokenRes = await fetch(
      `https://nid.naver.com/oauth2.0/token?` +
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: String(code),
          state: String(state),
        }),
      { method: 'GET' }
    )
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('Naver token error:', tokenData)
      return res.redirect('/login?error=token_failed')
    }

    // 2. 네이버 사용자 정보
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const userData = await userRes.json()
    const naverUser = userData.response

    if (!naverUser?.email) {
      return res.redirect('/login?error=no_email')
    }

    // 3. Supabase 유저 조회 또는 생성
    const supabaseAdmin = getSupabaseAdmin()

    const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const existingUser = listData?.users?.find(u => u.email === naverUser.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
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
    await pool.query(
      `INSERT INTO users (supabase_uid, email, name, role, provider)
       VALUES ($1, $2, $3, 'user', 'naver')
       ON CONFLICT (supabase_uid) DO UPDATE
       SET email = EXCLUDED.email`,
      [userId, naverUser.email, naverUser.name || '']
    )

    // 5. 매직링크로 자동 로그인
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://theoktop.com'
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: naverUser.email,
      options: {
        redirectTo: `${siteUrl}/mypage`,
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

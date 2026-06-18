import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error: oauthError, error_description } = req.query

  if (oauthError) {
    console.error('OAuth error:', oauthError, error_description)
    return res.redirect(`/login?error=${oauthError}`)
  }

  // code가 없으면 → 클라이언트 콜백 페이지로 (access_token이 해시로 올 때)
  if (!code) {
    return res.redirect('/auth/callback')
  }

  try {
    const supabase = createApiSupabaseClient(req, res)
    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code))

    if (error || !data?.session) {
      console.error('exchangeCodeForSession error:', error)
      return res.redirect('/login?error=session_failed')
    }

    try {
      const pool = getPool()
      const { user } = data.session
      const provider =
        user.app_metadata?.provider ??
        user.app_metadata?.providers?.[0] ??
        'email'
      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.preferred_username ??
        ''

      // 탈퇴 회원 재가입 여부 확인 (이메일 기준)
      const { rows: emailRows } = await pool.query(
        'SELECT id, status FROM users WHERE email = $1',
        [user.email ?? '']
      )

      if (emailRows.length > 0 && emailRows[0].status === 'withdrawn') {
        // 탈퇴 회원 재가입 → active 복구
        await pool.query(
          `UPDATE users
           SET status = 'active',
               supabase_uid = $1,
               withdrawn_at = NULL,
               withdraw_reason = NULL,
               provider = $2,
               name = COALESCE(NULLIF($3, ''), name)
           WHERE email = $4`,
          [user.id, provider, name, user.email ?? '']
        )
      } else if (emailRows.length === 0) {
        // 신규 회원
        await pool.query(
          `INSERT INTO users (supabase_uid, email, name, role, provider)
           VALUES ($1, $2, $3, 'user', $4)
           ON CONFLICT (supabase_uid) DO UPDATE
           SET email = EXCLUDED.email,
               name = CASE WHEN users.name = ''
                           THEN EXCLUDED.name
                           ELSE users.name END`,
          [user.id, user.email ?? '', name, provider]
        )
      } else {
        // 기존 active 회원 → supabase_uid/email 동기화
        await pool.query(
          `UPDATE users SET supabase_uid = $1 WHERE email = $2`,
          [user.id, user.email ?? '']
        )
      }

      const { rows } = await pool.query(
        'SELECT role FROM users WHERE supabase_uid = $1',
        [user.id]
      )
      const role = rows[0]?.role ?? 'user'

      if (role === 'admin' || role === 'superadmin') {
        return res.redirect('/admin/dashboard')
      }
      return res.redirect('/mypage')
    } catch (dbErr) {
      console.error('DB error:', dbErr)
      return res.redirect('/mypage')
    }
  } catch (err) {
    console.error('Callback error:', err)
    return res.redirect('/login?error=server_error')
  }
}

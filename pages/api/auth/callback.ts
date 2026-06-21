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

      const email = user.email ?? ''

      // supabase_uid로 먼저 확인 (정상 로그인, 재로그인)
      const { rows: uidRows } = await pool.query(
        'SELECT id, status FROM users WHERE supabase_uid = $1',
        [user.id]
      )

      // 이메일로도 확인 (탈퇴 후 supabase_uid가 바뀐 경우)
      const { rows: emailRows } = await pool.query(
        'SELECT id, status, supabase_uid FROM users WHERE email = $1',
        [email]
      )

      if (uidRows.length === 0 && emailRows.length > 0 && emailRows[0].status === 'withdrawn') {
        // 탈퇴 회원: 자동 복구하지 않고 신규 가입과 동일한 절차로 재가입을 받는다
        return res.redirect(
          `/register?from=rejoin&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`
        )
      }

      if (uidRows.length > 0) {
        // supabase_uid로 찾은 경우: 기존 유저 → active 상태 보장 및 이메일 동기화
        await pool.query(
          `UPDATE users
           SET status = 'active',
               email = $1,
               withdrawn_at = NULL,
               withdraw_reason = NULL
           WHERE supabase_uid = $2`,
          [email, user.id]
        )
      } else if (emailRows.length > 0) {
        // 이메일로 찾은 활성 회원: supabase_uid 교체 (동기화)
        await pool.query(
          `UPDATE users
           SET status = 'active',
               supabase_uid = $1,
               withdrawn_at = NULL,
               withdraw_reason = NULL,
               provider = $2,
               name = CASE WHEN name = '' OR name IS NULL THEN $3 ELSE name END
           WHERE email = $4`,
          [user.id, provider, name, email]
        )
      } else {
        // 완전히 새 회원
        await pool.query(
          `INSERT INTO users (supabase_uid, email, name, role, provider, status)
           VALUES ($1, $2, $3, 'user', $4, 'active')`,
          [user.id, email, name, provider]
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

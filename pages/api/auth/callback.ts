import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, error: oauthError } = req.query

  if (oauthError) {
    console.error('OAuth error:', oauthError)
    return res.redirect(`/login?error=${oauthError}`)
  }

  if (!code) {
    return res.redirect('/login?error=no_code')
  }

  try {
    const supabase = createApiSupabaseClient(req, res)

    const { data, error } = await supabase.auth.exchangeCodeForSession(String(code))
    if (error || !data?.session) {
      console.error('exchangeCodeForSession error:', error)
      return res.redirect('/login?error=session_failed')
    }

    const { user } = data.session

    try {
      const pool = getPool()
      const provider = user.app_metadata?.provider ?? 'oauth'
      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.preferred_username ??
        ''

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

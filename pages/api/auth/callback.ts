import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query

  if (!code) {
    return res.redirect('/login?error=no_code')
  }

  const supabase = createApiSupabaseClient(req, res)

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code))
  if (exchangeError) {
    console.error('callback exchange error:', exchangeError)
    return res.redirect('/login?error=auth_failed')
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    return res.redirect('/login?error=auth_failed')
  }

  const { id: supabaseUid, email = '', user_metadata, app_metadata } = session.user
  const name = user_metadata?.full_name ?? user_metadata?.name ?? email
  const provider = app_metadata?.provider ?? 'oauth'

  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO users (supabase_uid, email, name, role, provider)
       VALUES ($1, $2, $3, 'user', $4)
       ON CONFLICT (supabase_uid) DO UPDATE
       SET email = EXCLUDED.email,
           updated_at = NOW()`,
      [supabaseUid, email, name, provider]
    )

    const { rows } = await client.query(
      'SELECT role FROM users WHERE supabase_uid = $1',
      [supabaseUid]
    )
    const role = rows[0]?.role ?? 'user'

    if (role === 'admin' || role === 'superadmin') {
      return res.redirect('/admin/dashboard')
    }
    return res.redirect('/mypage')
  } catch (dbError) {
    console.error('callback DB error:', dbError)
    return res.redirect('/mypage')
  } finally {
    client.release()
  }
}

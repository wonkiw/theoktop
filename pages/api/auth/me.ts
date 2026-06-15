import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient, supabaseAdmin } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

async function getSessionUser(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (user) return user
  }
  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const user = await getSessionUser(req, res)
    if (!user) return res.status(401).json({ error: 'unauthorized' })

    const pool = getPool()
    let { rows } = await pool.query(
      'SELECT * FROM users WHERE supabase_uid = $1',
      [user.id]
    )

    if (rows.length === 0) {
      const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        user.user_metadata?.preferred_username ??
        ''
      const provider = user.app_metadata?.provider ?? 'email'

      await pool.query(
        `INSERT INTO users (supabase_uid, email, name, role, provider)
         VALUES ($1, $2, $3, 'user', $4)
         ON CONFLICT (supabase_uid) DO NOTHING`,
        [user.id, user.email ?? '', name, provider]
      )
      const result = await pool.query(
        'SELECT * FROM users WHERE supabase_uid = $1',
        [user.id]
      )
      rows = result.rows
    }

    const u = rows[0]
    return res.status(200).json({
      id:          u.id,
      email:       u.email,
      name:        u.name,
      role:        u.role,
      supabase_uid: u.supabase_uid,
      provider:    u.provider,
    })
  } catch (err) {
    console.error('[api/auth/me] error:', err)
    return res.status(500).json({ error: 'Server error' })
  }
}

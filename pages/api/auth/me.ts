import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return res.status(401).json({ error: 'Unauthorized' })

  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      'SELECT id, email, name, role, supabase_uid FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (!rows.length) return res.status(401).json({ error: 'User not found' })
    return res.status(200).json(rows[0])
  } catch (err) {
    console.error('[api/auth/me]', err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

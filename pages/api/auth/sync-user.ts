import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  const { supabase_uid, email, name, provider } = req.body

  if (!supabase_uid || !email) {
    return res.status(400).json({ error: 'missing fields' })
  }

  try {
    const pool = getPool()
    await pool.query(
      `INSERT INTO users (supabase_uid, email, name, role, provider)
       VALUES ($1, $2, $3, 'user', $4)
       ON CONFLICT (supabase_uid) DO UPDATE
       SET email = EXCLUDED.email,
           name = CASE WHEN users.name = ''
                       THEN EXCLUDED.name
                       ELSE users.name END`,
      [supabase_uid, email, name || '', provider || 'oauth']
    )
    return res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('sync-user error:', err)
    return res.status(500).json({ error: message })
  }
}

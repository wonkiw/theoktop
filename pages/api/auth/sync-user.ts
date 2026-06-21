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

    const { rows: emailRows } = await pool.query(
      'SELECT id, status FROM users WHERE email = $1',
      [email]
    )

    if (emailRows.length > 0 && emailRows[0].status === 'withdrawn') {
      // 탈퇴 회원: 자동 복구하지 않고 재가입 절차로 보내도록 클라이언트에 알린다
      return res.status(409).json({ ok: false, withdrawn: true, email, name, provider })
    } else {
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
    }

    return res.status(200).json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    console.error('sync-user error:', err)
    return res.status(500).json({ error: message })
  }
}

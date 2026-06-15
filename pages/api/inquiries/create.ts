import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient, supabaseAdmin } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

async function getUid(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (user) return user.id
  }
  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.id ?? null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const uid = await getUid(req, res)
    if (!uid) return res.status(401).json({ error: '로그인이 필요합니다' })

    const pool = getPool()

    let { rows: userRows } = await pool.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [uid]
    )

    if (userRows.length === 0) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(
        req.headers.authorization?.replace('Bearer ', '') ?? ''
      )
      const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
      const provider = user?.app_metadata?.provider ?? 'email'

      await pool.query(
        `INSERT INTO users (supabase_uid, email, name, role, provider)
         VALUES ($1, $2, $3, 'user', $4)
         ON CONFLICT (supabase_uid) DO NOTHING`,
        [uid, user?.email ?? '', name, provider]
      )
      const result = await pool.query('SELECT id FROM users WHERE supabase_uid = $1', [uid])
      userRows = result.rows
    }

    const userId = userRows[0]?.id
    if (!userId) return res.status(500).json({ error: '유저 정보를 찾을 수 없습니다' })

    const { building_address, inquiry_type, content, file_url, file_name } = req.body
    if (!content) return res.status(400).json({ error: '내용을 입력해주세요' })

    const { rows } = await pool.query(
      `INSERT INTO inquiries
         (user_id, building_address, inquiry_type, content, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [userId, building_address ?? '', inquiry_type ?? '', content]
    )
    const inquiry = rows[0]

    if (file_url && file_name) {
      await pool.query(
        `INSERT INTO inquiry_replies
           (inquiry_id, author_id, author_role, content, file_url, file_name)
         VALUES ($1, $2, 'user', '', $3, $4)`,
        [inquiry.id, userId, file_url, file_name]
      )
    }

    return res.status(200).json({ ok: true, inquiry })
  } catch (err) {
    console.error('[inquiries/create] error:', err)
    return res.status(500).json({ error: err instanceof Error ? err.message : 'server error' })
  }
}

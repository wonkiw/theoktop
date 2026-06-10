import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const client = await pool.connect()
  try {
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }
    const userId = userRows[0].id

    if (req.method === 'GET') {
      const { rows } = await client.query(
        `SELECT id, title, content, answer, status, created_at, answered_at
         FROM inquiries
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      )
      return res.status(200).json({ success: true, inquiries: rows })
    }

    if (req.method === 'POST') {
      const { title, content } = req.body
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ success: false, message: '제목과 내용을 입력해주세요.' })
      }
      const { rows } = await client.query(
        `INSERT INTO inquiries (user_id, title, content, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING id, title, content, status, created_at`,
        [userId, title.trim(), content.trim()]
      )
      return res.status(201).json({ success: true, inquiry: rows[0] })
    }

    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  } catch (err) {
    console.error('[mypage/inquiries]', err)
    return res.status(500).json({ success: false, message: '처리 중 오류가 발생했습니다.' })
  } finally {
    client.release()
  }
}

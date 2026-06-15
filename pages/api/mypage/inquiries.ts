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
  const uid = await getUid(req, res)
  if (!uid) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const client = await getPool().connect()
  try {
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [uid]
    )
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }
    const userId = userRows[0].id

    if (req.method === 'GET') {
      const { rows } = await client.query(
        `SELECT i.id, i.title, i.building_address, i.inquiry_type,
                i.content, i.answer, i.status,
                i.created_at, i.answered_at,
                COUNT(ir.id) FILTER (WHERE ir.author_role = 'admin') AS reply_count
         FROM inquiries i
         LEFT JOIN inquiry_replies ir ON ir.inquiry_id = i.id
         WHERE i.user_id = $1
         GROUP BY i.id
         ORDER BY i.created_at DESC`,
        [userId]
      )
      return res.status(200).json({ success: true, inquiries: rows })
    }

    if (req.method === 'POST') {
      const { title, content, building_address, inquiry_type } = req.body
      if (!content?.trim()) {
        return res.status(400).json({ success: false, message: '내용을 입력해주세요.' })
      }
      const { rows } = await client.query(
        `INSERT INTO inquiries (user_id, title, building_address, inquiry_type, content, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         RETURNING id, title, building_address, inquiry_type, content, status, created_at`,
        [userId, title?.trim() ?? '', building_address ?? '', inquiry_type ?? '', content.trim()]
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

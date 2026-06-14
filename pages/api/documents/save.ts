import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const { orderId, fileName, fileUrl, fileType } = req.body

  if (!orderId || !fileName || !fileUrl) {
    return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' })
  }

  const client = await getPool().connect()
  try {
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }
    const userId = userRows[0].id

    const { rows } = await client.query(
      `INSERT INTO documents (order_id, user_id, file_name, file_url, file_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [orderId, userId, fileName, fileUrl, fileType ?? null]
    )
    return res.status(201).json({ success: true, documentId: rows[0].id })
  } catch (err) {
    console.error('문서 저장 실패:', err)
    return res.status(500).json({ success: false, message: '문서 저장에 실패했습니다.' })
  } finally {
    client.release()
  }
}

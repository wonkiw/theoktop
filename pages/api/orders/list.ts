import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const supabase = createServerSupabaseClient({ req, res })
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

    const { rows } = await client.query(
      `SELECT
         o.id, o.building_address, o.building_detail,
         o.order_type, o.description, o.status, o.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id',        d.id,
               'file_name', d.file_name,
               'file_url',  d.file_url,
               'file_type', d.file_type
             )
           ) FILTER (WHERE d.id IS NOT NULL),
           '[]'
         ) AS documents
       FROM orders o
       LEFT JOIN documents d ON d.order_id = o.id
       WHERE o.user_id = $1
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userRows[0].id]
    )

    return res.status(200).json({ success: true, orders: rows })
  } catch (err) {
    console.error('의뢰 목록 조회 실패:', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  } finally {
    client.release()
  }
}

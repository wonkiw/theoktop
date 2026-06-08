import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const { building_address, building_detail, order_type, description } = req.body

  if (!building_address) {
    return res.status(400).json({ success: false, message: '건물 주소는 필수입니다.' })
  }

  const client = await pool.connect()
  try {
    // supabase_uid → users.id 조회
    const { rows: userRows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }
    const userId = userRows[0].id

    const { rows } = await client.query(
      `INSERT INTO orders (user_id, building_address, building_detail, order_type, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, building_address, building_detail ?? null, order_type ?? null, description ?? null]
    )
    return res.status(201).json({ success: true, orderId: rows[0].id })
  } catch (err) {
    console.error('주문 생성 실패:', err)
    return res.status(500).json({ success: false, message: '의뢰 등록에 실패했습니다.' })
  } finally {
    client.release()
  }
}

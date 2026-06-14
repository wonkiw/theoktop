import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../../lib/supabaseServer'
import { getPool } from '../../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false })
  }

  const authHeader = req.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ success: false, message: '인증 토큰이 없습니다.' })
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' })
  }

  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      'SELECT role, name FROM users WHERE supabase_uid = $1',
      [user.id]
    )

    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: '사용자 정보를 찾을 수 없습니다.' })
    }

    const { role, name } = rows[0]
    return res.status(200).json({ success: true, role, name })
  } catch (err) {
    console.error('[admin/auth/check-role]', err)
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' })
  } finally {
    client.release()
  }
}

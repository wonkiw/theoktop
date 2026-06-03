import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const supabaseUid = session.user.id

  if (req.method === 'GET') {
    const client = await pool.connect()
    try {
      const { rows } = await client.query(
        `SELECT name, email, phone, role, provider, created_at
         FROM users WHERE supabase_uid = $1`,
        [supabaseUid]
      )
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
      }
      return res.status(200).json({ success: true, user: rows[0] })
    } catch (err) {
      console.error('프로필 조회 실패:', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    } finally {
      client.release()
    }
  }

  if (req.method === 'PATCH') {
    const { name, phone } = req.body
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: '이름은 필수입니다.' })
    }

    const client = await pool.connect()
    try {
      const { rows } = await client.query(
        `UPDATE users SET name = $2, phone = $3, updated_at = NOW()
         WHERE supabase_uid = $1
         RETURNING name, phone`,
        [supabaseUid, name.trim(), phone?.trim() ?? null]
      )
      return res.status(200).json({ success: true, user: rows[0] })
    } catch (err) {
      console.error('프로필 수정 실패:', err)
      return res.status(500).json({ success: false, message: '수정 중 오류가 발생했습니다.' })
    } finally {
      client.release()
    }
  }

  return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
}

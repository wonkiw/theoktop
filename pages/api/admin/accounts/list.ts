import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { supabaseAdmin } from '../../../../lib/supabaseServer'
import { requireAdmin } from '../../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })
  if (admin.role !== 'superadmin') return res.status(403).json({ success: false, message: '슈퍼관리자 권한이 필요합니다.' })

  try {
    const { rows } = await pool.query(
      `SELECT id, supabase_uid, name, email, role, created_at
       FROM users
       WHERE role IN ('admin', 'superadmin')
       ORDER BY created_at ASC`
    )

    const accounts = await Promise.all(
      rows.map(async (row) => {
        if (!row.supabase_uid) return { ...row, last_sign_in_at: null }
        const { data } = await supabaseAdmin.auth.admin.getUserById(row.supabase_uid)
        return {
          ...row,
          last_sign_in_at: data?.user?.last_sign_in_at ?? null,
        }
      })
    )

    return res.status(200).json({ success: true, accounts })
  } catch (err) {
    console.error('[admin/accounts/list]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

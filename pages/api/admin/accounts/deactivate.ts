import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { supabaseAdmin } from '../../../../lib/supabaseServer'
import { requireAdmin } from '../../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })
  if (admin.role !== 'superadmin') return res.status(403).json({ success: false, message: '슈퍼관리자 권한이 필요합니다.' })

  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id가 필요합니다.' })

  // 본인 계정 비활성화 방지
  if (Number(user_id) === admin.id) {
    return res.status(400).json({ success: false, message: '본인 계정은 비활성화할 수 없습니다.' })
  }

  try {
    const { rows } = await pool.query(
      `SELECT supabase_uid, role FROM users WHERE id = $1 AND role IN ('admin', 'superadmin')`,
      [user_id]
    )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '관리자 계정을 찾을 수 없습니다.' })
    }

    const { supabase_uid } = rows[0]

    // Supabase 계정 영구 차단
    if (supabase_uid) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(supabase_uid, {
        ban_duration: '876000h',
      })
      if (error) {
        console.error('[admin/accounts/deactivate] Supabase ban error:', error)
        return res.status(500).json({ success: false, message: '계정 비활성화에 실패했습니다.' })
      }
    }

    // RDS 역할 업데이트
    await pool.query(
      `UPDATE users SET role = 'deactivated' WHERE id = $1`,
      [user_id]
    )

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('[admin/accounts/deactivate]', err)
    return res.status(500).json({ success: false, message: '처리 중 오류가 발생했습니다.' })
  }
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../../lib/db'
import { requireAdmin } from '../../../../../lib/adminAuth'
import { supabaseAdmin } from '../../../../../lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const userId = req.query.id as string
  const { reason } = req.body

  try {
    const { rows } = await getPool().query(
      'SELECT id, supabase_uid, status FROM users WHERE id = $1',
      [userId]
    )
    if (!rows.length) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }
    if (rows[0].status === 'withdrawn') {
      return res.status(400).json({ success: false, message: '이미 탈퇴한 사용자입니다.' })
    }

    const withdrawReason = `관리자 강제 탈퇴 (by ${admin.email})` + (reason ? `: ${reason}` : '')

    await getPool().query(
      `UPDATE users
       SET status = 'withdrawn',
           withdrawn_at = NOW(),
           withdraw_reason = $1
       WHERE id = $2`,
      [withdrawReason, userId]
    )

    const supabaseUid = rows[0].supabase_uid
    if (supabaseUid) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(supabaseUid)
      if (deleteError) {
        console.error('[force-withdraw] Supabase delete error:', deleteError)
      }
    }

    return res.status(200).json({ success: true, message: '강제 탈퇴 처리가 완료되었습니다.' })
  } catch (err) {
    console.error('[admin/users/[id]/force-withdraw]', err)
    return res.status(500).json({ success: false, message: '강제 탈퇴 처리 중 오류가 발생했습니다.' })
  }
}

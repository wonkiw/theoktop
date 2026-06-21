import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../../lib/db'
import { requireAdmin } from '../../../../../lib/adminAuth'

const VALID_TIERS = ['general', 'premium']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const userId = req.query.id as string
  const { tier } = req.body

  if (!VALID_TIERS.includes(tier)) {
    return res.status(400).json({ success: false, message: "tier는 'general' 또는 'premium'이어야 합니다." })
  }

  try {
    const { rows } = tier === 'premium'
      ? await getPool().query(
          `UPDATE users
           SET membership_tier = 'premium',
               premium_since = NOW(),
               premium_upgraded_by = $1
           WHERE id = $2
           RETURNING id, membership_tier, premium_since, premium_upgraded_by`,
          [admin.email, userId]
        )
      : await getPool().query(
          `UPDATE users
           SET membership_tier = 'general'
           WHERE id = $1
           RETURNING id, membership_tier, premium_since, premium_upgraded_by`,
          [userId]
        )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }

    return res.status(200).json({ success: true, user: rows[0] })
  } catch (err) {
    console.error('[admin/users/[id]/tier]', err)
    return res.status(500).json({ success: false, message: '등급 변경 중 오류가 발생했습니다.' })
  }
}

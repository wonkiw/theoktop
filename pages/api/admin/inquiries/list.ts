import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { status } = req.query

  // 'completed' 탭: 관리자가 답변한 상태(reviewing, completed) 모두 포함
  // 'pending' 탭: 아직 답변 전(pending)
  // 'all': 전체
  let whereClause = ''
  if (status === 'pending') {
    whereClause = `WHERE i.status = 'pending'`
  } else if (status === 'completed') {
    whereClause = `WHERE i.status IN ('reviewing', 'completed')`
  }

  try {
    const [listRes, pendingRes] = await Promise.all([
      getPool().query(
        `SELECT
           i.*,
           u.name  AS customer_name,
           u.email AS customer_email,
           COUNT(ir.id) FILTER (WHERE ir.author_role = 'admin') AS reply_count
         FROM inquiries i
         JOIN users u ON u.id = i.user_id
         LEFT JOIN inquiry_replies ir ON ir.inquiry_id = i.id
         ${whereClause}
         GROUP BY i.id, u.name, u.email
         ORDER BY i.created_at DESC`
      ),
      getPool().query(`SELECT COUNT(*) FROM inquiries WHERE status = 'pending'`),
    ])

    return res.status(200).json({
      success:      true,
      inquiries:    listRes.rows,
      pendingCount: Number(pendingRes.rows[0].count),
    })
  } catch (err) {
    console.error('[admin/inquiries/list]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

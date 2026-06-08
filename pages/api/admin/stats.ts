import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../lib/db'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false })
  }

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  try {
    const safeCount = (rows: { count: string }[]) => Number(rows[0]?.count ?? 0)

    const [todayRes, pendingRes, inquiryRes, usersRes] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) FROM orders
        WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'
      `),
      pool.query(`SELECT COUNT(*) FROM orders WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM inquiries WHERE status = 'pending'`)
        .catch(() => ({ rows: [{ count: '0' }] })),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'user'`),
    ])

    return res.status(200).json({
      success: true,
      stats: {
        todayOrders:         safeCount(todayRes.rows),
        pendingOrders:       safeCount(pendingRes.rows),
        unansweredInquiries: safeCount(inquiryRes.rows),
        totalUsers:          safeCount(usersRes.rows),
      },
    })
  } catch (err) {
    console.error('[admin/stats] DB 오류:', err)
    return res.status(500).json({ success: false, message: '통계 조회 중 오류가 발생했습니다.' })
  }
}

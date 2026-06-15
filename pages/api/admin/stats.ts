import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  try {
    const pool = getPool()
    const [inquiryStats, userStats, unansweredStats] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending'   THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'reviewing' THEN 1 END) as reviewing,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
        FROM inquiries
      `),
      pool.query(`SELECT COUNT(*) as total FROM users WHERE role = 'user'`),
      pool.query(`
        SELECT COUNT(DISTINCT i.id) as unanswered
        FROM inquiries i
        WHERE NOT EXISTS (
          SELECT 1 FROM inquiry_replies ir
          WHERE ir.inquiry_id = i.id AND ir.author_role = 'admin'
        ) AND i.status != 'completed'
      `),
    ])

    return res.status(200).json({
      totalInquiries:     Number(inquiryStats.rows[0]?.total      || 0),
      pendingInquiries:   Number(inquiryStats.rows[0]?.pending    || 0),
      reviewingInquiries: Number(inquiryStats.rows[0]?.reviewing  || 0),
      completedInquiries: Number(inquiryStats.rows[0]?.completed  || 0),
      totalUsers:         Number(userStats.rows[0]?.total         || 0),
      unansweredInquiries: Number(unansweredStats.rows[0]?.unanswered || 0),
    })
  } catch (err) {
    console.error('[admin/stats] error:', err)
    return res.status(200).json({
      totalInquiries: 0, pendingInquiries: 0,
      reviewingInquiries: 0, completedInquiries: 0,
      totalUsers: 0, unansweredInquiries: 0,
    })
  }
}

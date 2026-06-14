import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '@/lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const pool = getPool()

    const [inquiries, users] = await Promise.all([
      pool.query("SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending FROM inquiries"),
      pool.query("SELECT COUNT(*) as total FROM users WHERE role = 'user'"),
    ])

    res.status(200).json({
      totalInquiries:  Number(inquiries.rows[0]?.total  || 0),
      pendingInquiries: Number(inquiries.rows[0]?.pending || 0),
      totalUsers:      Number(users.rows[0]?.total      || 0),
    })
  } catch (err: any) {
    console.error('[admin/stats] error:', err)
    res.status(200).json({
      totalInquiries:  0,
      pendingInquiries: 0,
      totalUsers:      0,
      error: err.message,
    })
  }
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

const PAGE_SIZE = 30

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { search, page = '1' } = req.query
  const pageNum   = Math.max(1, Number(page))
  const offset    = (pageNum - 1) * PAGE_SIZE
  const searchVal = typeof search === 'string' && search.trim() ? `%${search.trim()}%` : null

  try {
    const where = `WHERE u.role = 'user' AND ($1::text IS NULL OR u.name ILIKE $1 OR u.email ILIKE $1)`

    const [countRes, listRes] = await Promise.all([
      getPool().query(
        `SELECT COUNT(*) FROM users u ${where}`,
        [searchVal]
      ),
      getPool().query(
        `SELECT
           u.id, u.name, u.email, u.phone, u.provider, u.role, u.created_at,
           (SELECT COUNT(*)::int FROM inquiries WHERE user_id = u.id) AS inquiry_count,
           (SELECT COUNT(*)::int FROM orders WHERE user_id = u.id) AS order_count
         FROM users u
         ${where}
         ORDER BY u.created_at DESC
         LIMIT $2 OFFSET $3`,
        [searchVal, PAGE_SIZE, offset]
      ),
    ])

    return res.status(200).json({
      success:  true,
      users:    listRes.rows,
      total:    Number(countRes.rows[0].count),
      page:     pageNum,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    console.error('[admin/users/list]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

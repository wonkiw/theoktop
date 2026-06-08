import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

const PAGE_SIZE = 20

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { status, search, page = '1' } = req.query
  const pageNum   = Math.max(1, Number(page))
  const offset    = (pageNum - 1) * PAGE_SIZE
  const statusVal = typeof status === 'string' && status !== 'all' ? status : null
  const searchVal = typeof search === 'string' && search.trim() ? `%${search.trim()}%` : null

  const where = `
    WHERE ($1::text IS NULL OR o.status = $1)
      AND ($2::text IS NULL OR u.name ILIKE $2 OR o.building_address ILIKE $2)
  `

  try {
    const [countRes, dataRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ${where}`,
        [statusVal, searchVal]
      ),
      pool.query(
        `SELECT
           o.id,
           o.building_address,
           o.order_type,
           o.status,
           o.created_at,
           u.name AS customer_name
         FROM orders o
         JOIN users u ON u.id = o.user_id
         ${where}
         ORDER BY o.created_at DESC
         LIMIT $3 OFFSET $4`,
        [statusVal, searchVal, PAGE_SIZE, offset]
      ),
    ])

    return res.status(200).json({
      success: true,
      orders:   dataRes.rows,
      total:    Number(countRes.rows[0].count),
      page:     pageNum,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    console.error('[admin/orders/list]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

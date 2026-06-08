import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

/*
  필요한 마이그레이션:
  CREATE TABLE IF NOT EXISTS inquiries (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    title       VARCHAR(255) NOT NULL,
    content     TEXT NOT NULL,
    answer      TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    answered_at TIMESTAMP WITH TIME ZONE,
    answered_by INTEGER REFERENCES users(id)
  );
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { status } = req.query
  const statusVal = typeof status === 'string' && status !== 'all' ? status : null

  try {
    const [listRes, pendingRes] = await Promise.all([
      pool.query(
        `SELECT
           i.id, i.title, i.content, i.answer, i.status,
           i.created_at, i.answered_at,
           u.name  AS customer_name,
           u.email AS customer_email
         FROM inquiries i
         JOIN users u ON u.id = i.user_id
         WHERE ($1::text IS NULL OR i.status = $1)
         ORDER BY i.created_at DESC`,
        [statusVal]
      ),
      pool.query(`SELECT COUNT(*) FROM inquiries WHERE status = 'pending'`),
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

import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

const VALID_STATUSES = ['pending', 'reviewing', 'completed']

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const inquiryId = Number(req.query.id)
  if (isNaN(inquiryId)) return res.status(400).json({ success: false, message: '잘못된 ID입니다.' })

  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query(
        `SELECT i.id, i.title, i.content, i.inquiry_type, i.building_address,
                i.status, i.answer, i.answered_at, i.created_at,
                u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
         FROM inquiries i
         JOIN users u ON u.id = i.user_id
         WHERE i.id = $1`,
        [inquiryId]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '상담을 찾을 수 없습니다.' })

      let replies: unknown[] = []
      try {
        const { rows: replyRows } = await getPool().query(
          `SELECT r.id, r.content, r.is_admin, r.file_url, r.file_name, r.created_at,
                  u.name AS author_name
           FROM inquiry_replies r
           LEFT JOIN users u ON u.id = r.user_id
           WHERE r.inquiry_id = $1
           ORDER BY r.created_at ASC`,
          [inquiryId]
        )
        replies = replyRows
      } catch {
        // inquiry_replies table may not exist yet
      }

      return res.status(200).json({ success: true, inquiry: rows[0], replies })
    } catch (err) {
      console.error('[admin/inquiries/[id] GET]', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'PATCH') {
    const { status } = req.body
    if (!status) return res.status(400).json({ success: false, message: '변경할 상태가 없습니다.' })
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: '올바르지 않은 상태값입니다.' })
    }

    try {
      await getPool().query(
        'UPDATE inquiries SET status = $2 WHERE id = $1',
        [inquiryId, status]
      )
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('[admin/inquiries/[id] PATCH]', err)
      return res.status(500).json({ success: false, message: '저장 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

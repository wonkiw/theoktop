import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import {
  getViewPresignedUrl,
  getDownloadPresignedUrl,
  extractKeyFromUrl,
} from '../../../../lib/s3'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const orderId = Number(req.query.id)
  if (isNaN(orderId)) return res.status(400).json({ success: false, message: '잘못된 의뢰 ID입니다.' })

  // ── GET: 상세 조회 ────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query(
        `SELECT
           o.id, o.building_address, o.building_detail, o.order_type,
           o.description, o.status, o.created_at, o.updated_at,
           COALESCE(o.admin_memo, '') AS admin_memo,
           u.name, u.email, u.phone,
           COALESCE(
             JSON_AGG(
               JSON_BUILD_OBJECT(
                 'id',        d.id,
                 'file_name', d.file_name,
                 'file_url',  d.file_url,
                 'file_type', d.file_type
               )
             ) FILTER (WHERE d.id IS NOT NULL),
             '[]'
           ) AS documents
         FROM orders o
         JOIN users u ON u.id = o.user_id
         LEFT JOIN documents d ON d.order_id = o.id
         WHERE o.id = $1
         GROUP BY o.id, u.name, u.email, u.phone`,
        [orderId]
      )

      if (!rows.length) return res.status(404).json({ success: false, message: '의뢰를 찾을 수 없습니다.' })

      const order = rows[0]

      // 각 문서에 presigned URL 첨부 (병렬)
      const documents = await Promise.all(
        (order.documents as {
          id: number
          file_name: string
          file_url: string
          file_type: string
        }[]).map(async (doc) => {
          const key = extractKeyFromUrl(doc.file_url)
          if (!key) return { ...doc, viewUrl: null, downloadUrl: null }
          const [viewUrl, downloadUrl] = await Promise.all([
            getViewPresignedUrl(key),
            getDownloadPresignedUrl(key, doc.file_name),
          ])
          return { ...doc, viewUrl, downloadUrl }
        })
      )

      return res.status(200).json({ success: true, order: { ...order, documents } })
    } catch (err) {
      console.error('[admin/orders/[id] GET]', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  // ── PATCH: 상태 변경 / 메모 저장 ─────────────────────────────
  if (req.method === 'PATCH') {
    const { status, admin_memo } = req.body
    const sets: string[] = ['updated_at = NOW()']
    const params: (number | string)[] = [orderId]

    if (status !== undefined) {
      params.push(status)
      sets.push(`status = $${params.length}`)
    }
    if (admin_memo !== undefined) {
      params.push(admin_memo)
      sets.push(`admin_memo = $${params.length}`)
    }

    if (sets.length === 1) return res.status(400).json({ success: false, message: '변경할 항목이 없습니다.' })

    try {
      await getPool().query(`UPDATE orders SET ${sets.join(', ')} WHERE id = $1`, params)
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('[admin/orders/[id] PATCH]', err)
      return res.status(500).json({ success: false, message: '저장 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { getViewPresignedUrl, getDownloadPresignedUrl, extractKeyFromUrl } from '../../../../lib/s3'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const userId = req.query.id as string
  if (!userId || typeof userId !== 'string') return res.status(400).json({ success: false, message: '잘못된 사용자 ID입니다.' })

  try {
    const [userRes, ordersRes, docsRes] = await Promise.all([
      getPool().query(
        `SELECT id, name, email, phone, provider, role, created_at
         FROM users WHERE id = $1`,
        [userId]
      ),
      getPool().query(
        `SELECT id, building_address, order_type, status, created_at
         FROM orders
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      ),
      getPool().query(
        `SELECT d.id, d.file_name, d.file_url, d.file_type, d.order_id
         FROM documents d
         WHERE d.user_id = $1
         ORDER BY d.id DESC`,
        [userId]
      ),
    ])

    if (!userRes.rows.length) {
      return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    }

    // 각 파일에 presigned URL 첨부
    const documents = await Promise.all(
      docsRes.rows.map(async (doc) => {
        const key = extractKeyFromUrl(doc.file_url)
        if (!key) return { ...doc, viewUrl: null, downloadUrl: null }
        const [viewUrl, downloadUrl] = await Promise.all([
          getViewPresignedUrl(key),
          getDownloadPresignedUrl(key, doc.file_name),
        ])
        return { ...doc, viewUrl, downloadUrl }
      })
    )

    return res.status(200).json({
      success: true,
      user:      userRes.rows[0],
      orders:    ordersRes.rows,
      documents,
    })
  } catch (err) {
    console.error('[admin/users/[id]]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

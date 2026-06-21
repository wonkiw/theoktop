import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query(
        `SELECT * FROM construction_sites ORDER BY display_order ASC, created_at DESC`
      )
      return res.status(200).json({ success: true, sites: rows })
    } catch (err) {
      console.error('[admin/construction-sites] list error:', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'POST') {
    const {
      title, address, area, area_unit, site_type, construction_status,
      progress_rate, description, is_featured_on_main, display_order, status,
    } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: '제목은 필수입니다.' })
    }

    try {
      const { rows } = await getPool().query(
        `INSERT INTO construction_sites
           (title, address, area, area_unit, site_type, construction_status,
            progress_rate, description, is_featured_on_main, display_order, status)
         VALUES ($1, $2, $3, COALESCE($4, '㎡'), $5, COALESCE($6, 'ongoing'),
                 $7, $8, COALESCE($9, false), COALESCE($10, 0), COALESCE($11, 'published'))
         RETURNING *`,
        [
          title.trim(), address ?? null, area ?? null, area_unit ?? null, site_type ?? null,
          construction_status ?? null, progress_rate ?? null, description ?? null,
          is_featured_on_main ?? null, display_order ?? null, status ?? null,
        ]
      )
      return res.status(201).json({ success: true, site: rows[0] })
    } catch (err) {
      console.error('[admin/construction-sites] create error:', err)
      return res.status(500).json({ success: false, message: '등록 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

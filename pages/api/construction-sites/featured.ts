import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  try {
    const { rows } = await getPool().query(
      `SELECT id, title, address, area, area_unit, site_type, construction_status,
              progress_rate, description, images
       FROM construction_sites
       WHERE is_featured_on_main = true AND status = 'published'
       ORDER BY display_order ASC, created_at DESC`
    )
    return res.status(200).json({ success: true, sites: rows })
  } catch (err) {
    console.error('[construction-sites/featured]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

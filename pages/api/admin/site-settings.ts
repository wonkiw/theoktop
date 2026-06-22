import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query('SELECT key, value, updated_at FROM site_settings ORDER BY key')
      return res.status(200).json({ success: true, settings: rows })
    } catch (err) {
      console.error('[admin/site-settings] list error:', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'PATCH') {
    const { key, value } = req.body
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'key가 필요합니다.' })
    }
    try {
      const { rows } = await getPool().query(
        'UPDATE site_settings SET value = $2, updated_at = NOW() WHERE key = $1 RETURNING *',
        [key, value ?? null]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '존재하지 않는 key입니다.' })
      return res.status(200).json({ success: true, setting: rows[0] })
    } catch (err) {
      console.error('[admin/site-settings] update error:', err)
      return res.status(500).json({ success: false, message: '수정 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

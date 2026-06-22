import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ success: false })

  const { key } = req.query
  if (!key || typeof key !== 'string') {
    return res.status(400).json({ success: false, message: 'key가 필요합니다.' })
  }

  try {
    const { rows } = await getPool().query(
      'SELECT value FROM site_settings WHERE key = $1',
      [key]
    )
    return res.status(200).json({ success: true, value: rows[0]?.value ?? null })
  } catch (err) {
    console.error('[site-settings]', err)
    return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
  }
}

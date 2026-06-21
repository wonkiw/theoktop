import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { extractKeyFromUrl, deleteObject } from '../../../../lib/s3'

const PATCHABLE_FIELDS = [
  'title', 'address', 'area', 'area_unit', 'site_type', 'construction_status',
  'progress_rate', 'description', 'is_featured_on_main', 'display_order', 'status',
]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const id = req.query.id as string

  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query('SELECT * FROM construction_sites WHERE id = $1', [id])
      if (!rows.length) return res.status(404).json({ success: false, message: '시공현장을 찾을 수 없습니다.' })
      return res.status(200).json({ success: true, site: rows[0] })
    } catch (err) {
      console.error('[admin/construction-sites/[id]] get error:', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'PATCH') {
    const entries = Object.entries(req.body).filter(([key]) => PATCHABLE_FIELDS.includes(key))
    if (entries.length === 0) {
      return res.status(400).json({ success: false, message: '수정할 필드가 없습니다.' })
    }

    const setClauses = entries.map(([key], i) => `${key} = $${i + 2}`)
    const values = entries.map(([, value]) => value)

    try {
      const { rows } = await getPool().query(
        `UPDATE construction_sites
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, ...values]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '시공현장을 찾을 수 없습니다.' })
      return res.status(200).json({ success: true, site: rows[0] })
    } catch (err) {
      console.error('[admin/construction-sites/[id]] patch error:', err)
      return res.status(500).json({ success: false, message: '수정 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { rows } = await getPool().query(
        'SELECT images FROM construction_sites WHERE id = $1', [id]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '시공현장을 찾을 수 없습니다.' })

      const images = (rows[0].images ?? []) as { url: string }[]
      await Promise.all(images.map(async img => {
        const key = extractKeyFromUrl(img.url)
        if (!key) return // 정적 경로 등 S3 키가 아닌 경우는 스킵
        try { await deleteObject(key) } catch (e) { console.error('[delete image]', img.url, e) }
      }))

      await getPool().query('DELETE FROM construction_sites WHERE id = $1', [id])
      return res.status(200).json({ success: true })
    } catch (err) {
      console.error('[admin/construction-sites/[id]] delete error:', err)
      return res.status(500).json({ success: false, message: '삭제 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

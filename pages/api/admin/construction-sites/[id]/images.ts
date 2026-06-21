import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../../lib/db'
import { requireAdmin } from '../../../../../lib/adminAuth'
import { uploadBuffer, extractKeyFromUrl, deleteObject } from '../../../../../lib/s3'

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } },
}

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAX_BYTES = 8 * 1024 * 1024

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const id = req.query.id as string

  if (req.method === 'POST') {
    const { fileType, fileBase64 } = req.body
    const ext = ALLOWED_TYPES[fileType]
    if (!ext) {
      return res.status(400).json({ success: false, message: 'JPG, PNG, WEBP 이미지만 업로드 가능합니다.' })
    }
    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return res.status(400).json({ success: false, message: '이미지 데이터가 없습니다.' })
    }

    const raw = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64
    const buffer = Buffer.from(raw, 'base64')
    if (buffer.byteLength > MAX_BYTES) {
      return res.status(400).json({ success: false, message: '이미지 크기는 8MB를 초과할 수 없습니다.' })
    }

    try {
      const { rows } = await getPool().query(
        'SELECT images FROM construction_sites WHERE id = $1', [id]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '시공현장을 찾을 수 없습니다.' })

      const images = (rows[0].images ?? []) as { url: string; order: number }[]
      const key = `construction-sites/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { fileUrl } = await uploadBuffer(key, buffer, fileType)

      const nextOrder = images.length > 0 ? Math.max(...images.map(i => i.order)) + 1 : 0
      const nextImages = [...images, { url: fileUrl, order: nextOrder }]

      const { rows: updated } = await getPool().query(
        `UPDATE construction_sites SET images = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(nextImages), id]
      )
      return res.status(201).json({ success: true, site: updated[0] })
    } catch (err) {
      console.error('[admin/construction-sites/[id]/images] upload error:', err)
      return res.status(500).json({ success: false, message: '이미지 업로드 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'DELETE') {
    const { imageUrl } = req.body
    if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl이 필요합니다.' })

    try {
      const { rows } = await getPool().query(
        'SELECT images FROM construction_sites WHERE id = $1', [id]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '시공현장을 찾을 수 없습니다.' })

      const images = (rows[0].images ?? []) as { url: string; order: number }[]
      const remaining = images
        .filter(img => img.url !== imageUrl)
        .sort((a, b) => a.order - b.order)
        .map((img, i) => ({ url: img.url, order: i }))

      const key = extractKeyFromUrl(imageUrl)
      if (key) {
        try { await deleteObject(key) } catch (e) { console.error('[delete image]', imageUrl, e) }
      }

      const { rows: updated } = await getPool().query(
        `UPDATE construction_sites SET images = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [JSON.stringify(remaining), id]
      )
      return res.status(200).json({ success: true, site: updated[0] })
    } catch (err) {
      console.error('[admin/construction-sites/[id]/images] delete error:', err)
      return res.status(500).json({ success: false, message: '이미지 삭제 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

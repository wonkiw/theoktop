import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getUploadPresignedUrl } from '../../../lib/s3'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })

  const { fileName, fileType, fileSize } = req.body
  if (!fileName || !fileType) {
    return res.status(400).json({ success: false, message: '파일 정보가 올바르지 않습니다.' })
  }
  if (!ALLOWED_TYPES.includes(fileType)) {
    return res.status(400).json({ success: false, message: 'PDF, JPG, PNG 파일만 업로드 가능합니다.' })
  }
  if (fileSize > MAX_BYTES) {
    return res.status(400).json({ success: false, message: '파일 크기는 10MB를 초과할 수 없습니다.' })
  }

  const ext = fileName.split('.').pop() ?? 'bin'
  const key = `inquiries/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, fileType, fileSize)
    return res.status(200).json({ success: true, uploadUrl, fileUrl, key })
  } catch (err) {
    console.error('[upload/presigned-url]', err)
    return res.status(500).json({ success: false, message: 'URL 발급 중 오류가 발생했습니다.' })
  }
}

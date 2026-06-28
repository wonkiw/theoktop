import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getUploadPresignedUrl } from '../../../lib/s3'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_BYTES = 10 * 1024 * 1024 // 10MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('[documents/upload-url] AWS 환경변수 누락: AWS_ACCESS_KEY_ID 또는 AWS_SECRET_ACCESS_KEY가 설정되지 않았습니다.')
    return res.status(500).json({ success: false, message: '파일 업로드 설정이 올바르지 않습니다. 관리자에게 문의해주세요.' })
  }

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

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
  const key = `documents/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  try {
    const { uploadUrl, fileUrl } = await getUploadPresignedUrl(key, fileType, fileSize)
    return res.status(200).json({ success: true, uploadUrl, fileUrl, key })
  } catch (err) {
    console.error('[documents/upload-url] presigned URL 발급 실패:', err)
    return res.status(500).json({ success: false, message: 'S3 업로드 URL 발급에 실패했습니다. 잠시 후 다시 시도해주세요.' })
  }
}

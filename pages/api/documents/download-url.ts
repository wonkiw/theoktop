import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getDownloadPresignedUrl, extractKeyFromUrl } from '../../../lib/s3'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
  }

  const { documentId } = req.query
  if (!documentId || typeof documentId !== 'string') {
    return res.status(400).json({ success: false, message: 'documentId가 필요합니다.' })
  }

  const client = await pool.connect()
  try {
    // 본인 소유 문서인지 확인
    const { rows } = await client.query(
      `SELECT d.file_name, d.file_url
       FROM documents d
       JOIN orders o ON o.id = d.order_id
       JOIN users u ON u.id = o.user_id
       WHERE d.id = $1 AND u.supabase_uid = $2`,
      [documentId, session.user.id]
    )
    if (rows.length === 0) {
      return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' })
    }

    const { file_name, file_url } = rows[0]

    const key = extractKeyFromUrl(file_url)
    if (!key) {
      return res.status(400).json({ success: false, message: '잘못된 파일 URL입니다.' })
    }

    const downloadUrl = await getDownloadPresignedUrl(key, file_name)
    return res.status(200).json({ success: true, downloadUrl })
  } catch (err) {
    console.error('다운로드 URL 생성 실패:', err)
    return res.status(500).json({ success: false, message: '다운로드 URL 생성에 실패했습니다.' })
  } finally {
    client.release()
  }
}

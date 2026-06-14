import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../lib/db'
import { supabaseAdmin, createApiSupabaseClient } from '../../../lib/supabaseServer'
import { requireAdmin } from '../../../lib/adminAuth'

async function getUid(req: NextApiRequest, res: NextApiResponse): Promise<string | null> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (user) return user.id
  }
  const supabase = createApiSupabaseClient(req, res)
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user.id ?? null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const inquiryId = Number(req.query.id)
  if (isNaN(inquiryId)) return res.status(400).json({ success: false, message: '잘못된 ID입니다.' })

  const admin = await requireAdmin(req.headers.authorization)
  let userId: number | null = null

  if (!admin) {
    const uid = await getUid(req, res)
    if (!uid) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })
    const { rows } = await getPool().query('SELECT id FROM users WHERE supabase_uid = $1', [uid])
    if (!rows.length) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' })
    userId = rows[0].id
  }

  if (req.method === 'GET') {
    try {
      const { rows } = await getPool().query(
        `SELECT i.id, i.title, i.content, i.inquiry_type, i.building_address,
                i.status, i.answer, i.answered_at, i.created_at, i.user_id,
                u.name AS customer_name, u.email AS customer_email
         FROM inquiries i
         JOIN users u ON u.id = i.user_id
         WHERE i.id = $1`,
        [inquiryId]
      )
      if (!rows.length) return res.status(404).json({ success: false, message: '상담을 찾을 수 없습니다.' })

      const inquiry = rows[0]
      if (!admin && inquiry.user_id !== userId) {
        return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' })
      }

      let replies: unknown[] = []
      try {
        const { rows: replyRows } = await getPool().query(
          `SELECT r.id, r.content, r.is_admin, r.file_url, r.file_name, r.created_at,
                  u.name AS author_name
           FROM inquiry_replies r
           LEFT JOIN users u ON u.id = r.user_id
           WHERE r.inquiry_id = $1
           ORDER BY r.created_at ASC`,
          [inquiryId]
        )
        replies = replyRows
      } catch {
        // inquiry_replies table may not exist yet — return empty
      }

      const { user_id: _uid, ...inquiryData } = inquiry
      void _uid
      return res.status(200).json({ success: true, inquiry: inquiryData, replies })
    } catch (err) {
      console.error('[inquiries/[id] GET]', err)
      return res.status(500).json({ success: false, message: '조회 중 오류가 발생했습니다.' })
    }
  }

  if (req.method === 'POST') {
    if (!admin && !userId) return res.status(401).json({ success: false, message: '로그인이 필요합니다.' })

    const { content, file_url, file_name, file_key } = req.body
    if (!content?.trim()) return res.status(400).json({ success: false, message: '내용을 입력해주세요.' })

    try {
      const { rows: inqRows } = await getPool().query(
        'SELECT user_id FROM inquiries WHERE id = $1',
        [inquiryId]
      )
      if (!inqRows.length) return res.status(404).json({ success: false, message: '상담을 찾을 수 없습니다.' })
      if (!admin && inqRows[0].user_id !== userId) {
        return res.status(403).json({ success: false, message: '접근 권한이 없습니다.' })
      }

      const authorId = admin ? admin.id : userId
      const isAdminReply = !!admin

      const { rows } = await getPool().query(
        `INSERT INTO inquiry_replies (inquiry_id, user_id, content, is_admin, file_url, file_name, file_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [inquiryId, authorId, content.trim(), isAdminReply, file_url ?? null, file_name ?? null, file_key ?? null]
      )

      if (!isAdminReply) {
        await getPool().query(
          `UPDATE inquiries SET status = 'reviewing' WHERE id = $1 AND status = 'pending'`,
          [inquiryId]
        )
      }

      return res.status(201).json({ success: true, reply: rows[0] })
    } catch (err) {
      console.error('[inquiries/[id] POST]', err)
      return res.status(500).json({ success: false, message: '처리 중 오류가 발생했습니다.' })
    }
  }

  return res.status(405).json({ success: false })
}

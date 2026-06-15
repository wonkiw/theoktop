import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { sendEmail, inquiryReplyTemplate } from '../../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { inquiry_id, send_email: sendEmailFlag = true, file_url, file_name } = req.body
  const replyContent: string = (req.body.content ?? req.body.answer ?? '').trim()

  if (!inquiry_id || !replyContent) {
    return res.status(400).json({ success: false, message: '문의 ID와 답변 내용이 필요합니다.' })
  }

  const client = await getPool().connect()
  try {
    await client.query(
      `INSERT INTO inquiry_replies (inquiry_id, author_id, author_role, content, file_url, file_name)
       VALUES ($1, $2, 'admin', $3, $4, $5)`,
      [inquiry_id, admin.id, replyContent, file_url ?? null, file_name ?? null]
    )

    await client.query(
      `UPDATE inquiries
       SET status = 'reviewing', answer = $2, answered_at = NOW()
       WHERE id = $1`,
      [inquiry_id, replyContent]
    )

    let emailSent = false
    let emailError: string | null = null
    if (sendEmailFlag) {
      try {
        const { rows } = await client.query(
          `SELECT u.name, u.email
           FROM inquiries i
           JOIN users u ON u.id = i.user_id
           WHERE i.id = $1`,
          [inquiry_id]
        )
        if (rows.length) {
          const { name, email } = rows[0]
          const { subject, html } = inquiryReplyTemplate(name, '', replyContent)
          const result = await sendEmail({ to: email, subject, html })
          emailSent = result.success
          if (!result.success) emailError = '이메일 발송 실패'
        }
      } catch (err) {
        console.error('[admin/inquiries/reply] email error:', err)
        emailError = err instanceof Error ? err.message : '이메일 발송 오류'
      }
    }

    return res.status(200).json({ success: true, emailSent, emailError })
  } catch (err) {
    console.error('[admin/inquiries/reply]', err)
    return res.status(500).json({ success: false, message: '답변 처리 중 오류가 발생했습니다.' })
  } finally {
    client.release()
  }
}

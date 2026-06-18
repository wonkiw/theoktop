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

  const pool = getPool()

  // 1. 답변 저장 (항상 실행, 실패 시 500 반환)
  try {
    await pool.query(
      `INSERT INTO inquiry_replies (inquiry_id, author_id, author_role, content, file_url, file_name)
       VALUES ($1, $2, 'admin', $3, $4, $5)`,
      [inquiry_id, admin.id, replyContent, file_url ?? null, file_name ?? null]
    )
    await pool.query(
      `UPDATE inquiries
       SET status = 'reviewing', answer = $2, answered_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [inquiry_id, replyContent]
    )
  } catch (saveErr: any) {
    console.error('[reply] save error:', saveErr)
    return res.status(500).json({ success: false, message: '저장 중 오류: ' + saveErr.message })
  }

  // 2. 이메일 발송 (선택적, 실패해도 200 반환)
  let emailSent = false
  let emailError: string | null = null

  if (sendEmailFlag) {
    try {
      const { rows } = await pool.query(
        `SELECT u.name, u.email
         FROM inquiries i
         LEFT JOIN users u ON u.id = i.user_id
         WHERE i.id = $1`,
        [inquiry_id]
      )
      const target = rows[0]

      if (!target?.email) {
        emailError = '수신자 이메일 없음'
      } else {
        const { subject, html } = inquiryReplyTemplate(target.name || '고객', '', replyContent)
        const result = await sendEmail({ to: target.email, subject, html })
        emailSent = result.success
        if (!result.success) emailError = result.error ?? '이메일 발송 실패'
      }
    } catch (emailErr: any) {
      console.error('[reply] email error:', emailErr)
      emailError = emailErr.message
    }
  }

  return res.status(200).json({
    success: true,
    ok: true,
    emailSent,
    emailError,
    message: emailSent
      ? '답변이 저장되고 이메일이 발송되었습니다'
      : emailError
        ? `답변이 저장되었습니다 (이메일 미발송: ${emailError})`
        : '답변이 저장되었습니다',
  })
}

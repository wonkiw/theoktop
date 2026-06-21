import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { sendEmail, orderFeedbackTemplate } from '../../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { order_id, content, send_email: sendEmailFlag = true } = req.body
  if (!order_id || !content?.trim()) {
    return res.status(400).json({ success: false, message: '의뢰 ID와 피드백 내용이 필요합니다.' })
  }

  const pool = getPool()

  // 1. 피드백 저장 (항상 실행, 실패 시 500 반환)
  try {
    await pool.query(
      `UPDATE orders
       SET admin_memo = CASE
         WHEN admin_memo IS NULL OR admin_memo = '' THEN $2::text
         ELSE admin_memo || E'\n---\n' || $2::text
       END,
       admin_feedback = $2::text,
       admin_feedback_at = NOW(),
       status = 'completed',
       updated_at = NOW()
       WHERE id = $1`,
      [order_id, content.trim()]
    )
  } catch (saveErr: any) {
    console.error('[feedback] save error:', saveErr)
    return res.status(500).json({ success: false, message: '저장 중 오류: ' + saveErr.message })
  }

  // 2. 이메일 발송 (선택적, 실패해도 200 반환)
  let emailSent = false
  let emailError: string | null = null

  if (sendEmailFlag) {
    try {
      const { rows } = await pool.query(
        `SELECT o.building_address, u.name AS customer_name, u.email AS customer_email
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         WHERE o.id = $1`,
        [order_id]
      )
      const target = rows[0]

      if (!target?.customer_email) {
        emailError = '수신자 이메일 없음'
      } else {
        const { subject, html } = orderFeedbackTemplate(
          target.customer_name || '고객',
          target.building_address || '',
          content.trim()
        )
        const result = await sendEmail({ to: target.customer_email, subject, html })
        emailSent = result.success
        if (!result.success) {
          const raw = result.error ?? '이메일 발송 실패'
          emailError = /domain|not verified|verify/i.test(raw)
            ? '이메일 발송 설정이 필요합니다 (Resend 도메인 미인증)'
            : raw
        }
      }
    } catch (emailErr: any) {
      console.error('[feedback] email error:', emailErr)
      const raw: string = emailErr.message ?? ''
      emailError = /domain|not verified|verify/i.test(raw)
        ? '이메일 발송 설정이 필요합니다 (Resend 도메인 미인증)'
        : raw
    }
  }

  return res.status(200).json({
    success: true,
    ok: true,
    emailSent,
    emailError,
    message: emailSent
      ? '피드백이 저장되고 이메일이 발송되었습니다'
      : emailError
        ? `피드백이 저장되었습니다 (이메일 미발송: ${emailError})`
        : '피드백이 저장되었습니다',
  })
}

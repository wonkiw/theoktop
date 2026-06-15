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
  try {
    const { rows } = await pool.query(
      `SELECT o.building_address, u.name AS customer_name, u.email AS customer_email
       FROM orders o
       JOIN users u ON u.id = o.user_id
       WHERE o.id = $1`,
      [order_id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: '의뢰를 찾을 수 없습니다.' })

    const { building_address, customer_name, customer_email } = rows[0]

    await pool.query(
      `UPDATE orders
       SET admin_memo = CASE
         WHEN admin_memo IS NULL OR admin_memo = '' THEN $2::text
         ELSE admin_memo || E'\n---\n' || $2::text
       END,
       updated_at = NOW()
       WHERE id = $1`,
      [order_id, content.trim()]
    )

    let emailSent = false
    let emailError: string | null = null
    if (sendEmailFlag) {
      try {
        const { subject, html } = orderFeedbackTemplate(customer_name, building_address, content.trim())
        const result = await sendEmail({ to: customer_email, subject, html })
        emailSent = result.success
        if (!result.success) emailError = '이메일 발송 실패'
      } catch (err) {
        console.error('[admin/orders/feedback] email error:', err)
        emailError = err instanceof Error ? err.message : '이메일 발송 오류'
      }
    }

    return res.status(200).json({ success: true, emailSent, emailError })
  } catch (err) {
    console.error('[admin/orders/feedback]', err)
    return res.status(500).json({ success: false, message: '피드백 저장 중 오류가 발생했습니다.' })
  }
}

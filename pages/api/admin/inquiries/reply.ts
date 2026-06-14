import type { NextApiRequest, NextApiResponse } from 'next'
import { getPool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { sendEmail, inquiryReplyTemplate } from '../../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { inquiry_id, answer } = req.body
  if (!inquiry_id || !answer?.trim()) {
    return res.status(400).json({ success: false, message: '문의 ID와 답변 내용이 필요합니다.' })
  }

  try {
    const { rows } = await getPool().query(
      `UPDATE inquiries
       SET answer = $2, status = 'answered', answered_at = NOW(), answered_by = $3
       WHERE id = $1 AND status = 'pending'
       RETURNING title, user_id`,
      [inquiry_id, answer, admin.id]
    )

    if (!rows.length) {
      return res.status(409).json({ success: false, message: '이미 답변된 문의이거나 존재하지 않습니다.' })
    }

    const { title, user_id } = rows[0]

    const { rows: userRows } = await getPool().query(
      'SELECT name, email FROM users WHERE id = $1',
      [user_id]
    )
    const { name: customerName, email: customerEmail } = userRows[0]

    const { subject, html } = inquiryReplyTemplate(customerName, title, answer)
    const emailResult = await sendEmail({ to: customerEmail, subject, html })

    return res.status(200).json({ success: true, emailSent: emailResult.success })
  } catch (err) {
    console.error('[admin/inquiries/reply]', err)
    return res.status(500).json({ success: false, message: '답변 처리 중 오류가 발생했습니다.' })
  }
}

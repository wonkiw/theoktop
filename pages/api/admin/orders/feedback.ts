import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { requireAdmin } from '../../../../lib/adminAuth'
import { sendEmail, orderFeedbackTemplate } from '../../../../lib/email'

/*
  필요한 마이그레이션:
  CREATE TABLE IF NOT EXISTS order_feedbacks (
    id           SERIAL PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    admin_user_id INTEGER NOT NULL REFERENCES users(id),
    content      TEXT NOT NULL,
    sent_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
*/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })

  const { order_id, content } = req.body
  if (!order_id || !content?.trim()) {
    return res.status(400).json({ success: false, message: '의뢰 ID와 피드백 내용이 필요합니다.' })
  }

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

    // 피드백 이력 저장
    await pool.query(
      `INSERT INTO order_feedbacks (order_id, admin_user_id, content, sent_at)
       VALUES ($1, $2, $3, NOW())`,
      [order_id, admin.id, content]
    )

    // 고객 이메일 발송
    const { subject, html } = orderFeedbackTemplate(customer_name, building_address, content)
    const emailResult = await sendEmail({ to: customer_email, subject, html })

    return res.status(200).json({ success: true, emailSent: emailResult.success })
  } catch (err) {
    console.error('[admin/orders/feedback]', err)
    return res.status(500).json({ success: false, message: '피드백 발송 중 오류가 발생했습니다.' })
  }
}

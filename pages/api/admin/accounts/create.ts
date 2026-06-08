import type { NextApiRequest, NextApiResponse } from 'next'
import { pool } from '../../../../lib/db'
import { supabaseAdmin } from '../../../../lib/supabaseServer'
import { requireAdmin } from '../../../../lib/adminAuth'
import { sendEmail, newAdminTemplate } from '../../../../lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false })

  const admin = await requireAdmin(req.headers.authorization)
  if (!admin) return res.status(401).json({ success: false, message: '관리자 권한이 필요합니다.' })
  if (admin.role !== 'superadmin') return res.status(403).json({ success: false, message: '슈퍼관리자 권한이 필요합니다.' })

  const { name, email, password, role } = req.body
  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return res.status(400).json({ success: false, message: '이름, 이메일, 비밀번호는 필수 항목입니다.' })
  }
  if (!['admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ success: false, message: '유효하지 않은 역할입니다.' })
  }

  // 이메일 중복 확인
  const { rows: existing } = await pool.query(
    'SELECT id FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  )
  if (existing.length) {
    return res.status(409).json({ success: false, message: '이미 존재하는 이메일입니다.' })
  }

  // Supabase 계정 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    console.error('[admin/accounts/create] Supabase error:', authError)
    return res.status(500).json({ success: false, message: '계정 생성에 실패했습니다: ' + authError?.message })
  }

  try {
    // RDS에 사용자 등록
    await pool.query(
      `INSERT INTO users (supabase_uid, name, email, role, provider, created_at)
       VALUES ($1, $2, $3, $4, 'email', NOW())`,
      [authData.user.id, name.trim(), email.trim().toLowerCase(), role]
    )

    // 안내 이메일 발송
    const { subject, html } = newAdminTemplate(name.trim(), email.trim(), password)
    await sendEmail({ to: email.trim(), subject, html })

    return res.status(200).json({ success: true })
  } catch (err) {
    // RDS 삽입 실패 시 Supabase 계정 롤백
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
    console.error('[admin/accounts/create] RDS error:', err)
    return res.status(500).json({ success: false, message: '계정 등록 중 오류가 발생했습니다.' })
  }
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseServer'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const { email, password, name } = req.body

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'email, password, name은 필수입니다.' })
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error || !data.user) {
    return res.status(400).json({ success: false, message: error?.message ?? '회원가입에 실패했습니다.' })
  }

  const supabaseUid = data.user.id

  const client = await pool.connect()
  try {
    await client.query(
      `INSERT INTO users (supabase_uid, email, name, role, provider)
       VALUES ($1, $2, $3, 'user', 'email')`,
      [supabaseUid, email, name]
    )
  } catch (dbError) {
    await supabaseAdmin.auth.admin.deleteUser(supabaseUid)
    return res.status(500).json({ success: false, message: '사용자 정보 저장에 실패했습니다.' })
  } finally {
    client.release()
  }

  return res.status(201).json({
    success: true,
    user: { email, name, role: 'user' },
  })
}

import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const { email, password, name } = req.body

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'email, password, name은 필수입니다.' })
  }

  const AUTH_ERROR_MAP: Record<string, string> = {
    'User already registered': '이미 사용 중인 이메일입니다.',
    'Email address is already used': '이미 사용 중인 이메일입니다.',
    'Invalid email': '유효하지 않은 이메일 형식입니다.',
    'Password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
    'Unable to validate email address: invalid format': '유효하지 않은 이메일 형식입니다.',
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (error || !data.user) {
    const msg = error?.message ?? ''
    const localMsg = AUTH_ERROR_MAP[msg] ?? '회원가입에 실패했습니다.'
    return res.status(400).json({ success: false, message: localMsg })
  }

  const supabaseUid = data.user.id

  const client = await getPool().connect()
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

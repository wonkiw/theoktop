import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

const PHONE_RE = /^01[0-9]-?\d{3,4}-?\d{4}$/

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: '허용되지 않는 메서드입니다.' })
  }

  const authHeader = req.headers.authorization

  // OAuth 탈퇴 재가입 완료: 이미 카카오/네이버/구글 OAuth로 인증된 세션(Bearer 토큰)을 통해
  // 부족했던 정보(전화번호, 약관 동의)만 추가로 받아 새 row를 만든다.
  if (authHeader?.startsWith('Bearer ')) {
    return handleRejoin(req, res, authHeader.slice(7))
  }

  const { email, password, name, phone, agreedTerms } = req.body

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ success: false, message: 'email, password, name, phone은 필수입니다.' })
  }
  if (!agreedTerms) {
    return res.status(400).json({ success: false, message: '이용약관 동의가 필요합니다.' })
  }
  if (!PHONE_RE.test(String(phone).replace(/\s/g, ''))) {
    return res.status(400).json({ success: false, message: '올바른 휴대폰번호를 입력해주세요.' })
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
      `INSERT INTO users (supabase_uid, email, name, phone, role, provider)
       VALUES ($1, $2, $3, $4, 'user', 'email')`,
      [supabaseUid, email, name, phone]
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

async function handleRejoin(req: NextApiRequest, res: NextApiResponse, token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data.user) {
    return res.status(401).json({ success: false, message: '인증 정보가 유효하지 않습니다.' })
  }

  const { name, phone, agreedTerms } = req.body
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'name, phone은 필수입니다.' })
  }
  if (!agreedTerms) {
    return res.status(400).json({ success: false, message: '이용약관 동의가 필요합니다.' })
  }
  if (!PHONE_RE.test(String(phone).replace(/\s/g, ''))) {
    return res.status(400).json({ success: false, message: '올바른 휴대폰번호를 입력해주세요.' })
  }

  const user = data.user
  const email = user.email ?? ''
  const provider = user.app_metadata?.provider ?? user.app_metadata?.providers?.[0] ?? 'oauth'

  const client = await getPool().connect()
  try {
    const { rows: withdrawnRows } = await client.query(
      `SELECT id FROM users WHERE email = $1 AND status = 'withdrawn' ORDER BY withdrawn_at DESC LIMIT 1`,
      [email]
    )
    const prevWithdrawnId = withdrawnRows[0]?.id ?? null

    await client.query(
      `INSERT INTO users
         (supabase_uid, email, name, phone, role, provider, status, is_rejoined, rejoined_at, prev_withdrawn_id)
       VALUES ($1, $2, $3, $4, 'user', $5, 'active', true, NOW(), $6)`,
      [user.id, email, name, phone, provider, prevWithdrawnId]
    )
  } catch (dbError) {
    return res.status(500).json({ success: false, message: '재가입 처리에 실패했습니다.' })
  } finally {
    client.release()
  }

  return res.status(201).json({
    success: true,
    user: { email, name, role: 'user' },
  })
}

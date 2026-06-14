import type { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin, createApiSupabaseClient } from '../../../lib/supabaseServer'
import { getPool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state } = req.query

  // CSRF 검증
  const storedState = req.cookies['naver_oauth_state']
  if (!code || !state || state !== storedState) {
    return res.redirect('/login?error=invalid_state')
  }

  // 네이버 access_token 발급
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: process.env.NAVER_CLIENT_ID!,
    client_secret: process.env.NAVER_CLIENT_SECRET!,
    code: code as string,
    state: state as string,
  })

  let accessToken: string
  try {
    const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?${tokenParams}`)
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      return res.redirect('/login?error=token_failed')
    }
    accessToken = tokenData.access_token
  } catch {
    return res.redirect('/login?error=token_failed')
  }

  // 네이버 사용자 정보 조회
  let naverEmail: string
  let naverName: string
  try {
    const userRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    if (userData.resultcode !== '00') {
      return res.redirect('/login?error=userinfo_failed')
    }
    naverEmail = userData.response.email
    naverName = userData.response.name
  } catch {
    return res.redirect('/login?error=userinfo_failed')
  }

  // RDS 기준으로 유저 조회 → Supabase 생성 또는 재사용
  let supabaseUid: string
  const client = await getPool().connect()
  try {
    const { rows } = await client.query(
      'SELECT supabase_uid FROM users WHERE email = $1',
      [naverEmail]
    )

    if (rows.length > 0) {
      supabaseUid = rows[0].supabase_uid
      await client.query(
        'UPDATE users SET updated_at = NOW() WHERE email = $1',
        [naverEmail]
      )
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: naverEmail,
        email_confirm: true,
        user_metadata: { name: naverName, provider: 'naver' },
      })
      if (createError || !newUser.user) {
        console.error('Supabase 유저 생성 실패:', createError)
        return res.redirect('/login?error=create_user_failed')
      }
      supabaseUid = newUser.user.id
      await client.query(
        `INSERT INTO users (supabase_uid, email, name, role, provider)
         VALUES ($1, $2, $3, 'user', 'naver')`,
        [supabaseUid, naverEmail, naverName]
      )
    }
  } catch (dbError) {
    console.error('DB 처리 실패:', dbError)
    return res.redirect('/login?error=db_failed')
  } finally {
    client.release()
  }

  // Supabase 세션 쿠키 설정
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: naverEmail,
  })

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error('매직링크 생성 실패:', linkError)
    return res.redirect('/login?error=session_failed')
  }

  const supabase = createApiSupabaseClient(req, res)
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError) {
    console.error('세션 생성 실패:', verifyError)
    return res.redirect('/login?error=session_failed')
  }

  return res.redirect('/mypage')
}

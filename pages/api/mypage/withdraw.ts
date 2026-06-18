import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getPool } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const supabaseAdmin = getSupabaseAdmin()
    let userId: string | null = null

    // 방법 1: Authorization 헤더 토큰으로 유저 확인 (가장 신뢰성 높음)
    const authHeader = req.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const { data } = await supabaseAdmin.auth.getUser(token)
      if (data.user) {
        userId = data.user.id
      }
    }

    // 방법 2: 쿠키 세션으로 fallback
    if (!userId) {
      const supabase = createApiSupabaseClient(req, res)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        userId = session.user.id
      }
    }

    if (!userId) {
      return res.status(401).json({ error: '로그인이 필요합니다' })
    }

    const { reason } = req.body
    const pool = getPool()

    // RDS에 없어도 Supabase 삭제는 진행
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [userId]
    )

    if (rows.length > 0) {
      await pool.query(
        `UPDATE users
         SET status = 'withdrawn',
             withdrawn_at = NOW(),
             withdraw_reason = $1
         WHERE supabase_uid = $2`,
        [reason || null, userId]
      )
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError) {
      console.error('[withdraw] Supabase delete error:', deleteError)
    }

    const host = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      .replace('https://', '').split('.')[0]

    const cookieNames = [
      `sb-${host}-auth-token`,
      `sb-${host}-auth-token.0`,
      `sb-${host}-auth-token.1`,
      'sb-access-token',
      'sb-refresh-token',
      `sb-${host}-auth-token-code-verifier`,
    ]

    const expiredCookies = [
      ...cookieNames.map(name =>
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
      ),
      ...cookieNames.map(name =>
        `${name}=; Path=/; Domain=.theoktop.com; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
      ),
    ]

    res.setHeader('Set-Cookie', expiredCookies)
    return res.status(200).json({ ok: true, message: '회원탈퇴가 완료되었습니다' })
  } catch (err: any) {
    console.error('[withdraw] error:', err)
    return res.status(500).json({ error: err.message })
  }
}

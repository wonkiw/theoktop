import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabaseServer'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getPool } from '@/lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const supabase = createApiSupabaseClient(req, res)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return res.status(401).json({ error: '로그인이 필요합니다' })
    }

    const { reason } = req.body
    const pool = getPool()

    const { rows: userRows } = await pool.query(
      'SELECT * FROM users WHERE supabase_uid = $1',
      [session.user.id]
    )

    if (userRows.length === 0) {
      return res.status(404).json({ error: '유저를 찾을 수 없습니다' })
    }

    await pool.query(
      `UPDATE users
       SET status = 'withdrawn',
           withdrawn_at = NOW(),
           withdraw_reason = $1
       WHERE supabase_uid = $2`,
      [reason || null, session.user.id]
    )

    const supabaseAdmin = getSupabaseAdmin()
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      session.user.id
    )

    if (deleteError) {
      console.error('[withdraw] Supabase delete error:', deleteError)
    }

    const host = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
      .replace('https://', '').split('.')[0]

    const expiredCookies = [
      `sb-${host}-auth-token`,
      `sb-${host}-auth-token.0`,
      `sb-${host}-auth-token.1`,
      'sb-access-token',
      'sb-refresh-token',
    ].map(name =>
      `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    )

    res.setHeader('Set-Cookie', expiredCookies)

    return res.status(200).json({ ok: true, message: '회원탈퇴가 완료되었습니다' })
  } catch (err: any) {
    console.error('[withdraw] error:', err)
    return res.status(500).json({ error: err.message })
  }
}

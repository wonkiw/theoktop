import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { pool } from '../../../lib/db'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient({ req, res })

  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session?.user) {
    return res.redirect('/login?error=auth_failed')
  }

  const { id: supabaseUid, email = '', user_metadata, app_metadata } = session.user
  const name = user_metadata?.full_name ?? user_metadata?.name ?? email
  const provider = app_metadata?.provider ?? 'email'

  const client = await pool.connect()
  try {
    const { rows } = await client.query(
      'SELECT id FROM users WHERE supabase_uid = $1',
      [supabaseUid]
    )

    if (rows.length === 0) {
      await client.query(
        `INSERT INTO users (supabase_uid, email, name, role, provider)
         VALUES ($1, $2, $3, 'user', $4)`,
        [supabaseUid, email, name, provider]
      )
    } else {
      await client.query(
        'UPDATE users SET updated_at = NOW() WHERE supabase_uid = $1',
        [supabaseUid]
      )
    }
  } catch (dbError) {
    console.error('DB 처리 실패:', dbError)
    return res.redirect('/login?error=db_failed')
  } finally {
    client.release()
  }

  return res.redirect('/mypage')
}

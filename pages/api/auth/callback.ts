import type { NextApiRequest, NextApiResponse } from 'next'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { pool } from '../../../lib/db'

function buildSetCookieHeader(name: string, value: string, options: Record<string, unknown>): string {
  let cookie = `${name}=${value}`
  if (options?.path)    cookie += `; Path=${options.path}`
  if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`
  if (options?.domain)  cookie += `; Domain=${options.domain}`
  if (options?.secure)  cookie += '; Secure'
  if (options?.httpOnly) cookie += '; HttpOnly'
  if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`
  return cookie
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookieHeaders: string[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          Object.entries(req.cookies ?? {}).map(([name, value]) => ({
            name,
            value: value ?? '',
          })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieHeaders.push(buildSetCookieHeader(name, value, options as Record<string, unknown>))
          })
          res.setHeader('Set-Cookie', cookieHeaders)
        },
      },
    }
  )

  // PKCE 코드 교환
  const { code } = req.query
  if (typeof code === 'string') {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return res.redirect('/login?error=auth_failed')
    }
  }

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

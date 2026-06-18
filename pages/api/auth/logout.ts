import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createApiSupabaseClient(req, res)
    await supabase.auth.signOut()
  } catch (e) {
    console.error('logout error', e)
  }

  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .replace('https://', '')
    .split('.')[0]

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
  res.writeHead(302, { Location: '/' })
  res.end()
}

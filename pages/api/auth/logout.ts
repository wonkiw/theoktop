import type { NextApiRequest, NextApiResponse } from 'next'
import { createApiSupabaseClient } from '@/lib/supabaseServer'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const supabase = createApiSupabaseClient(req, res)
    await supabase.auth.signOut()
  } catch (e) {
    console.error('[logout] signOut error:', e)
  }

  const host = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .replace('https://', '')
    .split('.')[0]

  const cookieNames = [
    `sb-${host}-auth-token`,
    `sb-${host}-auth-token.0`,
    `sb-${host}-auth-token.1`,
    `sb-${host}-auth-token-code-verifier`,
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token',
    'naver_state',
  ]

  const domains = [
    '',
    '; Domain=.theoktop.com',
    '; Domain=theoktop.com',
    '; Domain=www.theoktop.com',
  ]

  const expiredCookies: string[] = []
  cookieNames.forEach(name => {
    domains.forEach(domain => {
      // HttpOnly 없는 버전 (JS로 set된 쿠키)
      expiredCookies.push(
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${domain}`
      )
      // HttpOnly 있는 버전 (서버에서 set된 쿠키)
      expiredCookies.push(
        `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax${domain}`
      )
    })
  })

  res.setHeader('Set-Cookie', expiredCookies)
  res.writeHead(302, { Location: '/' })
  res.end()
}
